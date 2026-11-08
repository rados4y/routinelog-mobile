import { HttpMasterGateway } from './master/gateway';
import type { MasterTable, MasterValue } from './master/models';
import { z } from 'zod';
import { dateSchema } from '../../domain/models';
import { statusFromText, supportedColumn } from './descriptions';
import { NotionClient } from './client';
import type { CellStatus, MonthRef, MonthTable, NotionGateway } from './models';
import { isNotesColumn } from './dailyNotes';

const textSchema = z.array(
  z.object({
    plain_text: z.string().optional(),
    text: z.object({ content: z.string() }).optional(),
  }),
);
const text = (value: unknown) =>
  textSchema
    .parse(value)
    .map((part) => part.plain_text ?? part.text?.content ?? '')
    .join('');
const blockSchema = z.object({
  id: z.string(),
  type: z.string(),
  child_page: z.object({ title: z.string() }).optional(),
  child_database: z.object({ title: z.string() }).optional(),
});
const columnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.string(),
});
const sourceSchema = z.object({
  id: z.string(),
  properties: z.record(z.string(), columnSchema),
  in_trash: z.boolean().optional(),
});
const databaseSchema = z.object({
  id: z.string(),
  data_sources: z.array(z.object({ id: z.string() })),
});
const rowSchema = z.object({
  id: z.string(),
  last_edited_time: z.string(),
  in_trash: z.boolean().optional(),
  properties: z.record(z.string(), z.unknown()),
});
const propertyValueSchema = z.object({
  id: z.string(),
  type: z.string(),
  checkbox: z.boolean().optional(),
  rich_text: z.unknown().optional(),
  date: z.object({ start: z.string() }).nullable().optional(),
  select: z.object({ name: z.string() }).nullable().optional(),
  status: z.object({ name: z.string() }).nullable().optional(),
});
const richText = (content: string) => [{ type: 'text', text: { content } }];

export class HttpNotionGateway implements NotionGateway {
  constructor(
    private client: NotionClient,
    private rootPageId: string,
  ) {}
  readRoutines() {
    return new HttpMasterGateway(this.client, this.rootPageId).readRoutines();
  }
  writeRoutine(
    table: MasterTable,
    routineId: string,
    value: MasterValue,
    pageId?: string,
  ) {
    return new HttpMasterGateway(this.client, this.rootPageId).writeRoutine(
      table,
      routineId,
      value,
      pageId,
    );
  }
  finishRoutineMigration(table: MasterTable) {
    return new HttpMasterGateway(
      this.client,
      this.rootPageId,
    ).finishRoutineMigration(table);
  }
  async listMonths(): Promise<MonthRef[]> {
    // A failed/partial listing throws; it must never look like deleted columns.
    await this.client.call(`pages/${this.rootPageId}`);
    const blocks = z
      .array(blockSchema)
      .parse(await this.client.all(`blocks/${this.rootPageId}/children`));
    const months: MonthRef[] = [];
    for (const block of blocks) {
      if (block.type !== 'child_page') continue;
      const month = block.child_page?.title.match(
        /^(\d{4}-(?:0[1-9]|1[0-2]))(?:\s|$)/,
      )?.[1];
      if (!month) continue;
      const children = z
        .array(blockSchema)
        .parse(await this.client.all(`blocks/${block.id}/children`));
      const databases = children.filter(
        (child) =>
          child.type === 'child_database' &&
          child.child_database?.title === month,
      );
      if (databases.length > 1 || months.some((item) => item.month === month))
        throw new Error(
          `Notion has two tables for ${month}. Keep one table to avoid ambiguous sync.`,
        );
      if (databases[0])
        months.push({ month, pageId: block.id, databaseId: databases[0].id });
      else {
        // Reuse a month page left after an interrupted create rather than duplicate it.
        months.push({ month, pageId: block.id, databaseId: '' });
      }
    }
    return months;
  }
  async createMonth(month: string): Promise<MonthRef> {
    const existing = (await this.listMonths()).find(
      (item) => item.month === month,
    );
    if (existing?.databaseId) return existing;
    const pageId =
      existing?.pageId ??
      z.object({ id: z.string() }).parse(
        await this.client.call('pages', 'POST', {
          parent: { type: 'page_id', page_id: this.rootPageId },
          properties: {
            title: {
              title: richText(
                `${month} · ${new Date(`${month}-15T12:00:00`).toLocaleDateString('pl-PL', { month: 'long' })}`,
              ),
            },
          },
          icon: { type: 'emoji', emoji: '🗓️' },
        }),
      ).id;
    const database = databaseSchema.parse(
      await this.client.call('databases', 'POST', {
        parent: { type: 'page_id', page_id: pageId },
        title: richText(month),
        is_inline: true,
        initial_data_source: {
          properties: { Dzień: { title: {} }, Data: { date: {} } },
        },
      }),
    );
    return { month, pageId, databaseId: database.id };
  }
  async readMonth(ref: MonthRef): Promise<MonthTable> {
    const database = databaseSchema.parse(
      await this.client.call(`databases/${ref.databaseId}`),
    );
    if (database.data_sources.length !== 1)
      throw new Error(`The ${ref.month} table must have one data source.`);
    const dataSourceId = database.data_sources[0]!.id;
    const source = sourceSchema.parse(
      await this.client.call(`data_sources/${dataSourceId}`),
    );
    if (source.in_trash)
      throw new Error(
        `The ${ref.month} table is in the trash. Restore it before syncing.`,
      );
    const columns = Object.values(source.properties).map((property) => ({
      ...property,
      description: property.description ?? '',
    }));
    const dateColumn = columns.find(
      (column) => column.type === 'date' && column.name === 'Data',
    );
    if (!dateColumn)
      throw new Error(
        `The ${ref.month} table is missing its “Data” date column. Restore it before syncing.`,
      );
    const rows: MonthTable['rows'] = [];
    const noteColumn =
      columns.find((column) => column.id === ref.notesPropertyId) ??
      columns.find(isNotesColumn);
    for (const raw of await this.client.all(
      `data_sources/${dataSourceId}/query`,
      'POST',
    )) {
      const row = rowSchema.parse(raw);
      if (row.in_trash) continue;
      const properties = Object.values(row.properties).map((value) =>
        propertyValueSchema.parse(value),
      );
      const date = properties
        .find((value) => value.id === dateColumn.id)
        ?.date?.start.slice(0, 10);
      if (
        !date ||
        !dateSchema.safeParse(date).success ||
        !date.startsWith(`${ref.month}-`)
      )
        throw new Error(
          `Fix an invalid row date in ${ref.month}. Every day needs its own date.`,
        );
      if (rows.some((existing) => existing.date === date))
        throw new Error(
          `The ${ref.month} table contains duplicate rows for ${date}. Remove the extra row.`,
        );
      const cells: Record<string, CellStatus> = {};
      for (const column of columns.filter(
        (item) => item.id !== noteColumn?.id && supportedColumn(item),
      )) {
        const value = properties.find((property) => property.id === column.id);
        if (!value) throw new Error('Incomplete Notion cell data. Try again.');
        cells[column.id] =
          value.type === 'checkbox'
            ? value.checkbox
              ? 'done'
              : 'pending'
            : statusFromText(
                value.type === 'rich_text'
                  ? text(value.rich_text)
                  : ((value.select ?? value.status)?.name ?? ''),
              );
      }
      let note = '';
      if (noteColumn) {
        const value = properties.find(
          (property) => property.id === noteColumn.id,
        );
        if (!value || value.type !== 'rich_text')
          throw new Error(
            'Incomplete daily-note data or changed column type. Restore the Text property before syncing.',
          );
        let parts = textSchema.parse(value.rich_text);
        if (parts.length >= 25) {
          let propertyId = noteColumn.id;
          try {
            propertyId = decodeURIComponent(propertyId);
          } catch {
            /* Encode raw IDs as-is. */
          }
          const items = z
            .array(
              z.object({
                type: z.literal('rich_text'),
                rich_text: textSchema.element,
              }),
            )
            .parse(
              await this.client.all(
                `pages/${row.id}/properties/${encodeURIComponent(propertyId)}`,
              ),
            );
          parts = items.map((item) => item.rich_text);
        }
        note = text(parts);
      }
      rows.push({
        id: row.id,
        date,
        editedAt: row.last_edited_time,
        cells,
        note,
      });
    }
    return {
      ...ref,
      dataSourceId,
      columns,
      rows,
      notesPropertyId: noteColumn?.id,
    };
  }
  async updateColumns(
    table: MonthTable,
    patches: Record<string, unknown>,
  ): Promise<MonthTable> {
    const properties: Record<string, unknown> = {};
    for (const [key, patch] of Object.entries(patches)) {
      if (!patch || typeof patch !== 'object') {
        properties[key] = patch;
        continue;
      }
      const fields = patch as Record<string, unknown>;
      const column = table.columns.find(
        (item) => item.id === key || item.name === key,
      );
      if (
        typeof fields.description === 'string' &&
        [...fields.description].length > 280
      ) {
        throw new Error(
          `The description for “${column?.name ?? key}” exceeds the Notion limit of 280 characters including settings. Shorten its note in the app. The full note remains on your phone.`,
        );
      }
      // Description updates require the existing type's settings. Empty settings
      // preserve options; sending a regenerated options list could remove custom values.
      properties[key] =
        column &&
        Object.hasOwn(fields, 'description') &&
        !Object.hasOwn(fields, column.type)
          ? { ...fields, [column.type]: {} }
          : fields;
    }
    await this.client.call(`data_sources/${table.dataSourceId}`, 'PATCH', {
      properties,
    });
    return this.readMonth(table);
  }
  async createDay(table: MonthTable, date: string): Promise<void> {
    const title = table.columns.find((column) => column.type === 'title');
    const dateColumn = table.columns.find(
      (column) => column.type === 'date' && column.name === 'Data',
    );
    if (!title || !dateColumn)
      throw new Error('The Dzień or Data column is missing.');
    await this.client.call('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: table.dataSourceId },
      properties: {
        [title.id]: {
          title: richText(
            `${Number(date.slice(-2))} · ${new Date(`${date}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'short' })}`,
          ),
        },
        [dateColumn.id]: { date: { start: date } },
      },
    });
  }
  async writeCells(
    rowId: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    await this.client.call(`pages/${rowId}`, 'PATCH', { properties });
  }
}
