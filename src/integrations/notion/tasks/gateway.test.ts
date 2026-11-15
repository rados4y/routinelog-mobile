import { describe, expect, it, vi } from 'vitest';
import { NotionClient, type NotionFetch } from '../client';
import { HttpTaskGateway } from './gateway';
const text = (value: string) => [{ plain_text: value }];
const source = {
  description: text('RoutineLog daily tasks (v1)'),
  properties: {
    Description: { type: 'title' },
    Date: { type: 'date' },
    Done: { type: 'checkbox' },
    'Task ID': { type: 'rich_text' },
    Archived: { type: 'checkbox' },
  },
};
const row = (id = 'page-one') => ({
  id,
  created_time: '2026-11-15T12:00:00Z',
  last_edited_time: '2026-11-15T12:01:00Z',
  properties: {
    Description: { type: 'title', title: text('Buy bread') },
    Date: { type: 'date', date: null },
    Done: { type: 'checkbox', checkbox: false },
    'Task ID': { type: 'rich_text', rich_text: [] },
    Archived: { type: 'checkbox', checkbox: false },
  },
});
function setup(
  pages: {
    results: ReturnType<typeof row>[];
    has_more: boolean;
    next_cursor: string | null;
  }[] = [{ results: [row()], has_more: false, next_cursor: null }],
  actualSource = source,
  additionalResponses: unknown[] = [],
) {
  const responses = [
    {
      results: [
        {
          id: 'tasks-db',
          type: 'child_database',
          child_database: { title: 'Tasks' },
        },
      ],
      has_more: false,
      next_cursor: null,
    },
    { id: 'tasks-db', data_sources: [{ id: 'tasks-source' }] },
    actualSource,
    ...pages,
    ...additionalResponses,
  ];
  const fetch = vi
    .fn<NotionFetch>()
    .mockImplementation(async () => Response.json(responses.shift()));
  return {
    fetch,
    gateway: new HttpTaskGateway(
      new NotionClient('fake-token', fetch, async () => {}),
      'root',
    ),
  };
}
describe('Notion Tasks transport', () => {
  it('reads the complete formatted description instead of Notion’s truncated title', async () => {
    const original = row();
    const formatted = {
      ...original,
      properties: {
        ...original.properties,
        Description: {
          ...original.properties.Description,
          id: 'ti%3Atle',
          title: Array.from({ length: 25 }, () => ({
            plain_text: 'truncated',
          })),
        },
      },
    };
    const { gateway, fetch } = setup(
      [{ results: [formatted], has_more: false, next_cursor: null }],
      source,
      [
        {
          results: [
            { type: 'title', title: { plain_text: 'Complete description\n' } },
          ],
          has_more: true,
          next_cursor: 'rest',
        },
        {
          results: [{ type: 'title', title: { plain_text: 'Final 💛' } }],
          has_more: false,
          next_cursor: null,
        },
      ],
    );
    expect((await gateway.readTasks()).rows[0]?.value.description).toBe(
      'Complete description\nFinal 💛',
    );
    expect(fetch.mock.calls[4]?.[0]).toBe(
      'https://api.notion.com/v1/pages/page-one/properties/ti%3Atle?page_size=100',
    );
    expect(fetch.mock.calls[5]?.[0]).toContain('start_cursor=rest');
  });
  it('reads every page, defaults new task dates and gives each Notion row stable identity', async () => {
    const { gateway, fetch } = setup([
      { results: [row()], has_more: true, next_cursor: 'next' },
      { results: [row('page-two')], has_more: false, next_cursor: null },
    ]);
    const table = await gateway.readTasks();
    expect(table.rows.map((item) => item.id)).toEqual([
      'notion-task-page-one',
      'notion-task-page-two',
    ]);
    expect(table.rows[0]).toMatchObject({
      needsWrite: true,
      value: {
        date: '2026-11-15',
        description: 'Buy bread',
        done: false,
        archived: false,
      },
    });
    expect(JSON.parse(String(fetch.mock.calls[4]?.[1]?.body))).toMatchObject({
      start_cursor: 'next',
    });
    fetch.mockResolvedValueOnce(Response.json({ id: 'page-one' }));
    await gateway.writeTask(
      table,
      table.rows[0]!.id,
      table.rows[0]!.value,
      'page-one',
    );
    const call = fetch.mock.calls.at(-1)!;
    expect(call[0]).toBe('https://api.notion.com/v1/pages/page-one');
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({
      properties: {
        Description: { title: [{ text: { content: 'Buy bread' } }] },
        Date: { date: { start: '2026-11-15' } },
        'Task ID': {
          rich_text: [{ text: { content: 'notion-task-page-one' } }],
        },
      },
    });
  });
  it('creates a missing table using the current data-source API', async () => {
    const responses = [
      { results: [], has_more: false, next_cursor: null },
      { id: 'new-db' },
      { id: 'new-db', data_sources: [{ id: 'new-source' }] },
      source,
      { results: [], has_more: false, next_cursor: null },
    ];
    const fetch = vi
      .fn<NotionFetch>()
      .mockImplementation(async () => Response.json(responses.shift()));
    const gateway = new HttpTaskGateway(
      new NotionClient('fake', fetch, async () => {}),
      'root',
    );
    expect((await gateway.readTasks()).databaseId).toBe('new-db');
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toMatchObject({
      initial_data_source: {
        properties: { Description: { title: {} }, Done: { checkbox: {} } },
      },
    });
  });
  it('refuses missing properties, duplicate identities, and incomplete page listings', async () => {
    const malformed = setup(undefined, {
      ...source,
      properties: { ...source.properties, Done: { type: 'rich_text' } },
    });
    await expect(malformed.gateway.readTasks()).rejects.toThrow(
      'Restore the Done',
    );
    const duplicate = setup([
      { results: [row(), row()], has_more: false, next_cursor: null },
    ]);
    await expect(duplicate.gateway.readTasks()).rejects.toThrow(
      'Duplicate Task ID',
    );
    const partial = setup([
      { results: [row()], has_more: true, next_cursor: null },
    ]);
    await expect(partial.gateway.readTasks()).rejects.toThrow();
  });
});
