import { z } from 'zod';
import { localDate } from '../../../domain/dates';
import { NotionClient } from '../client';
import { richTextString } from '../master/codec';
import {
  taskValueSchema,
  type TaskGateway,
  type TaskTable,
  type TaskValue,
} from './models';

const properties = {
  Description: { title: {} },
  Date: { date: {} },
  Done: { checkbox: {} },
  'Task ID': { rich_text: {} },
  Archived: { checkbox: {} },
};
const marker = 'RoutineLog daily tasks (v1)';
const richText = (content: string) => [{ type: 'text', text: { content } }];
const databaseSchema = z.object({
  id: z.string(),
  in_trash: z.boolean().optional(),
  data_sources: z.array(z.object({ id: z.string() })).length(1),
});
const propertySchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  title: z.unknown().optional(),
  rich_text: z.unknown().optional(),
  checkbox: z.boolean().optional(),
  date: z.object({ start: z.string() }).nullable().optional(),
});
const rowSchema = z.object({
  id: z.string(),
  in_trash: z.boolean().optional(),
  created_time: z.iso.datetime(),
  last_edited_time: z.iso.datetime(),
  properties: z.record(z.string(), propertySchema),
});

export class HttpTaskGateway implements TaskGateway {
  constructor(
    private client: NotionClient,
    private root: string,
  ) {}
  async readTasks(): Promise<TaskTable> {
    const blocks = z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          child_database: z.object({ title: z.string() }).optional(),
        }),
      )
      .parse(await this.client.all(`blocks/${this.root}/children`));
    const matches = blocks.filter(
      (block) =>
        block.type === 'child_database' &&
        block.child_database?.title === 'Tasks',
    );
    if (matches.length > 1)
      throw new Error(
        'More than one Tasks database exists. Keep one before syncing.',
      );
    let id = matches[0]?.id;
    if (!id)
      id = z.object({ id: z.string() }).parse(
        await this.client.call('databases', 'POST', {
          parent: { type: 'page_id', page_id: this.root },
          title: richText('Tasks'),
          initial_data_source: { properties },
        }),
      ).id;
    const database = databaseSchema.parse(
      await this.client.call(`databases/${id}`),
    );
    const dataSourceId = database.data_sources[0]!.id;
    const source = z
      .object({
        in_trash: z.boolean().optional(),
        description: z.unknown().optional(),
        properties: z.record(z.string(), z.object({ type: z.string() })),
      })
      .parse(await this.client.call(`data_sources/${dataSourceId}`));
    if (database.in_trash || source.in_trash)
      throw new Error(
        'Restore the Tasks database from the trash before syncing.',
      );
    for (const [name, settings] of Object.entries(properties)) {
      if (source.properties[name]?.type !== Object.keys(settings)[0])
        throw new Error(
          `Restore the ${name} property in Tasks. Local tasks are safe.`,
        );
    }
    const description = source.description
      ? richTextString(source.description)
      : '';
    if (description && !description.startsWith(marker))
      throw new Error(
        'The Tasks database is not a RoutineLog tasks database. It has not been changed.',
      );
    if (!description)
      await this.client.call(`data_sources/${dataSourceId}`, 'PATCH', {
        description: richText(
          `${marker}\nOne description per task. Date defaults to the creation day. Done toggles completion; Archived removes a task from the app. Keep Task ID unchanged.`,
        ),
      });
    const rows: TaskTable['rows'] = [];
    for (const raw of await this.client.all(
      `data_sources/${dataSourceId}/query`,
      'POST',
    )) {
      const row = rowSchema.parse(raw);
      if (row.in_trash) continue;
      // Notion truncates rich title/text properties at 25 parts. Read the full
      // property before merging, even if the text is short but heavily formatted.
      for (const name of ['Description', 'Task ID']) {
        const prop = row.properties[name];
        const kind = prop?.type;
        if (!prop || (kind !== 'title' && kind !== 'rich_text')) continue;
        const parts = z.array(z.unknown()).parse(prop[kind]);
        if (parts.length < 25) continue;
        if (!prop.id)
          throw new Error(
            'Incomplete task text. Sync stopped without truncating your description.',
          );
        let propertyId = prop.id;
        try {
          propertyId = decodeURIComponent(propertyId);
        } catch {
          /* Keep raw property IDs. */
        }
        const full = await this.client.all(
          `pages/${row.id}/properties/${encodeURIComponent(propertyId)}`,
        );
        prop[kind] = full.map(
          (part) => z.record(z.string(), z.unknown()).parse(part)[kind],
        );
      }
      const value = (name: string, type: string) => {
        const prop = row.properties[name];
        if (!prop || prop.type !== type)
          throw new Error(
            `Incomplete ${name} data in Tasks. Sync stopped safely.`,
          );
        return prop;
      };
      const description = richTextString(value('Description', 'title').title);
      // New, untouched Notion rows are drafts until they contain a description.
      const identity = richTextString(value('Task ID', 'rich_text').rich_text);
      if (!description.trim() && !identity.trim()) continue;
      const date = value('Date', 'date').date?.start.slice(0, 10);
      const taskId = identity.trim() || `notion-task-${row.id}`;
      if (rows.some((item) => item.id === taskId))
        throw new Error(
          'Duplicate Task ID in Notion. Keep each task ID unique.',
        );
      rows.push({
        id: taskId,
        pageId: row.id,
        value: taskValueSchema.parse({
          description,
          date: date ?? localDate(new Date(row.created_time)),
          done: value('Done', 'checkbox').checkbox,
          archived: value('Archived', 'checkbox').checkbox,
        }),
        createdAt: row.created_time,
        updatedAt: row.last_edited_time,
        needsWrite: !identity || !date,
      });
    }
    return { databaseId: database.id, dataSourceId, rows };
  }
  async writeTask(
    table: TaskTable,
    id: string,
    value: TaskValue,
    pageId?: string,
  ): Promise<string> {
    const valid = taskValueSchema.parse(value);
    return z.object({ id: z.string() }).parse(
      await this.client.call(
        pageId ? `pages/${pageId}` : 'pages',
        pageId ? 'PATCH' : 'POST',
        {
          ...(pageId
            ? {}
            : {
                parent: {
                  type: 'data_source_id',
                  data_source_id: table.dataSourceId,
                },
              }),
          properties: {
            Description: { title: richText(valid.description) },
            Date: { date: { start: valid.date } },
            Done: { checkbox: valid.done },
            'Task ID': { rich_text: richText(id) },
            Archived: { checkbox: valid.archived },
          },
        },
      ),
    ).id;
  }
}
