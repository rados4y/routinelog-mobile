import { describe, expect, it, vi } from 'vitest';
import { NotionClient, type NotionFetch } from './client';
import { HttpNotionGateway } from './gateway';

describe('Notion API transport', () => {
  it('follows all cursors on the current data-source API and keeps auth on a fixed origin', async () => {
    const request = vi
      .fn<NotionFetch>()
      .mockResolvedValueOnce(
        Response.json({
          results: [{ id: 'one' }],
          has_more: true,
          next_cursor: 'second',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          results: [{ id: 'two' }],
          has_more: false,
          next_cursor: null,
        }),
      );
    const client = new NotionClient('test-user-token', request, async () => {});
    expect(await client.all('data_sources/ds/query', 'POST')).toEqual([
      { id: 'one' },
      { id: 'two' },
    ]);
    expect(request.mock.calls[1]?.[0]).toBe(
      'https://api.notion.com/v1/data_sources/ds/query',
    );
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toMatchObject({
      start_cursor: 'second',
      page_size: 100,
    });
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({
      'Notion-Version': '2026-03-11',
      Authorization: 'Bearer test-user-token',
    });
  });
  it('honors rate limits and does not echo errors or secret material', async () => {
    const request = vi
      .fn<NotionFetch>()
      .mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'retry-after': '2' } }),
      )
      .mockResolvedValueOnce(
        new Response('do not expose this body', { status: 401 }),
      );
    const wait = vi.fn(async (_ms: number) => {});
    await expect(
      new NotionClient('test-token', request, wait).call('pages/root'),
    ).rejects.toThrow('Token Notion');
    expect(wait).toHaveBeenCalledWith(2000);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('does not retry ambiguous create failures that could duplicate pages', async () => {
    const request = vi
      .fn<NotionFetch>()
      .mockRejectedValue(new Error('raw credential-like error'));
    await expect(
      new NotionClient('test-token', request, async () => {}).call(
        'pages',
        'POST',
        {},
      ),
    ).rejects.toThrow('Nie można połączyć');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects incomplete pagination rather than reporting empty data', async () => {
    const request = vi
      .fn<NotionFetch>()
      .mockResolvedValue(
        Response.json({ results: [], has_more: true, next_cursor: null }),
      );
    await expect(
      new NotionClient('test-token', request, async () => {}).all(
        'blocks/root/children',
      ),
    ).rejects.toThrow('Niepełna');
  });
  it('identifies a rejected schema write without displaying response content or credentials', async () => {
    const request = vi.fn<NotionFetch>().mockResolvedValue(
      Response.json(
        {
          code: 'validation_error',
          message: 'sensitive reflected request test-token',
        },
        { status: 400 },
      ),
    );
    const error = await new NotionClient('test-token', request, async () => {})
      .call('data_sources/ds', 'PATCH', {})
      .catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('zapis ustawień kolumn rutyn');
    expect((error as Error).message).toContain('400 (validation_error)');
    expect((error as Error).message).not.toMatch(
      /sensitive|reflected|test-token/,
    );
  });
  it('never trusts arbitrary API error codes or non-JSON responses', async () => {
    for (const response of [
      Response.json(
        { code: 'secret-value', message: 'secret-value' },
        { status: 400 },
      ),
      new Response('secret-value', { status: 500 }),
    ]) {
      const request = vi.fn<NotionFetch>().mockResolvedValue(response);
      const error = await new NotionClient(
        'test-token',
        request,
        async () => {},
      )
        .call('data_sources/ds/query', 'POST', {})
        .catch((error: unknown) => error);
      expect((error as Error).message).toContain('pobieranie wpisów z tabeli');
      expect((error as Error).message).not.toContain('secret-value');
    }
  });
});

describe('monthly Notion HTTP adapter', () => {
  const ref = { month: '2026-11', pageId: 'month', databaseId: 'db' };
  const source = {
    id: 'ds',
    properties: {
      Dzień: { id: 'title', name: 'Dzień', type: 'title', description: null },
      Data: { id: 'date-id', name: 'Data', type: 'date', description: null },
      '💊 Lek': {
        id: 'A%3Ab',
        name: '💊 Lek',
        type: 'select',
        description: 'Po śniadaniu',
      },
    },
  };
  function transport(rows: unknown[]) {
    return vi.fn<NotionFetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/databases/db'))
        return Response.json({ id: 'db', data_sources: [{ id: 'ds' }] });
      if (url.endsWith('/data_sources/ds')) return Response.json(source);
      return Response.json({
        results: rows,
        has_more: false,
        next_cursor: null,
      });
    });
  }
  const row = (date = '2026-11-01') => ({
    id: 'day',
    last_edited_time: '2026-11-01T12:00:00Z',
    properties: {
      Data: { id: 'date-id', type: 'date', date: { start: date } },
      Dzień: { id: 'title', type: 'title', title: [] },
      '💊 Lek': { id: 'A%3Ab', type: 'select', select: { name: 'Wykonane' } },
    },
  });
  it('maps stable encoded property IDs, dates and status badges from a real-shaped response', async () => {
    const gateway = new HttpNotionGateway(
      new NotionClient('test-token', transport([row()]), async () => {}),
      'root',
    );
    const table = await gateway.readMonth(ref);
    expect(table.rows[0]).toMatchObject({
      date: '2026-11-01',
      cells: { 'A%3Ab': 'done' },
    });
    expect(table.columns.find((col) => col.id === 'A%3Ab')?.description).toBe(
      'Po śniadaniu',
    );
  });
  it('refuses duplicate dates and dates outside the month', async () => {
    for (const rows of [[row(), row()], [row('2026-12-01')]]) {
      const gateway = new HttpNotionGateway(
        new NotionClient('test-token', transport(rows), async () => {}),
        'root',
      );
      await expect(gateway.readMonth(ref)).rejects.toThrow();
    }
  });
  it('creates a database using initial_data_source rather than the deprecated properties contract', async () => {
    const request = vi
      .fn<NotionFetch>()
      .mockImplementation(async (input, init) => {
        if (init?.method === 'POST')
          return String(input).endsWith('/pages')
            ? Response.json({ id: 'month-page' })
            : Response.json({ id: 'new-db', data_sources: [{ id: 'new-ds' }] });
        return String(input).includes('/children')
          ? Response.json({ results: [], has_more: false, next_cursor: null })
          : Response.json({ id: 'root' });
      });
    const gateway = new HttpNotionGateway(
      new NotionClient('test-token', request, async () => {}),
      'root',
    );
    expect(await gateway.createMonth('2026-11')).toMatchObject({
      databaseId: 'new-db',
      pageId: 'month-page',
    });
    const create = request.mock.calls.find(([url]) =>
      String(url).endsWith('/databases'),
    );
    expect(JSON.parse(String(create?.[1]?.body))).toMatchObject({
      is_inline: true,
      initial_data_source: { properties: { Data: { date: {} } } },
    });
  });
  it('updates descriptions beside unchanged type settings without replacing select options', async () => {
    const read = transport([row()]);
    const request = vi
      .fn<NotionFetch>()
      .mockImplementation(async (url, init) => {
        if (init.method === 'PATCH') {
          const body = JSON.parse(String(init.body)) as {
            properties: Record<string, Record<string, unknown>>;
          };
          // Notion documents description writes beside a property's type settings.
          if (!body.properties['A%3Ab']?.select)
            return Response.json(
              { code: 'validation_error', message: 'type settings required' },
              { status: 400 },
            );
          return Response.json(source);
        }
        return read(url, init);
      });
    const gateway = new HttpNotionGateway(
      new NotionClient('test-token', request, async () => {}),
      'root',
    );
    const table = await gateway.readMonth(ref);
    await gateway.updateColumns(table, {
      'A%3Ab': {
        name: '💊 Lek',
        description: 'Po śniadaniu\nKategoria: Zdrowie',
      },
    });
    const patch = request.mock.calls.find(
      ([, init]) => init.method === 'PATCH',
    );
    expect(JSON.parse(String(patch?.[1].body))).toEqual({
      properties: {
        'A%3Ab': {
          name: '💊 Lek',
          description: 'Po śniadaniu\nKategoria: Zdrowie',
          select: {},
        },
      },
    });
    expect(table.rows[0]?.cells['A%3Ab']).toBe('done');
  });
  it.each(['checkbox', 'rich_text'])(
    'keeps the %s type when updating its description',
    async (type) => {
      const request = transport([row()]);
      const gateway = new HttpNotionGateway(
        new NotionClient('test-token', request, async () => {}),
        'root',
      );
      const table = await gateway.readMonth(ref);
      table.columns.find((column) => column.id === 'A%3Ab')!.type = type;
      await gateway.updateColumns(table, {
        'A%3Ab': { description: 'Notatka' },
      });
      const patch = request.mock.calls.find(
        ([, init]) => init.method === 'PATCH',
      );
      expect(JSON.parse(String(patch?.[1].body))).toEqual({
        properties: { 'A%3Ab': { description: 'Notatka', [type]: {} } },
      });
    },
  );
  it('retains explicit option edits, pure renames and deletions', async () => {
    const request = transport([row()]);
    const gateway = new HttpNotionGateway(
      new NotionClient('test-token', request, async () => {}),
      'root',
    );
    const table = await gateway.readMonth(ref);
    const options = [{ id: 'existing-option' }];
    await gateway.updateColumns(table, {
      'A%3Ab': { description: 'Opis', select: { options } },
      other: null,
      third: { name: 'Nowa nazwa' },
    });
    const patch = request.mock.calls.find(
      ([, init]) => init.method === 'PATCH',
    );
    expect(JSON.parse(String(patch?.[1].body))).toEqual({
      properties: {
        'A%3Ab': { description: 'Opis', select: { options } },
        other: null,
        third: { name: 'Nowa nazwa' },
      },
    });
  });
  it('reports the documented 280-character limit before sending any schema mutation', async () => {
    const request = transport([row()]);
    const gateway = new HttpNotionGateway(
      new NotionClient('test-token', request, async () => {}),
      'root',
    );
    const table = await gateway.readMonth(ref);
    await expect(
      gateway.updateColumns(table, {
        'A%3Ab': { description: 'x'.repeat(281) },
      }),
    ).rejects.toThrow('280 znaków');
    await expect(
      gateway.updateColumns(table, {
        'Nowa rutyna': { description: 'x'.repeat(281), select: {} },
      }),
    ).rejects.toThrow('280 znaków');
    expect(request.mock.calls.some(([, init]) => init.method === 'PATCH')).toBe(
      false,
    );
    await gateway.updateColumns(table, {
      'A%3Ab': { description: 'ą'.repeat(280) },
    });
    expect(request.mock.calls.some(([, init]) => init.method === 'PATCH')).toBe(
      true,
    );
  });
});
