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
});
