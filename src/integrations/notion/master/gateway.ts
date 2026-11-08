import { localDate } from '../../../domain/dates';
import { z } from 'zod';
import { NotionClient } from '../client';
import {
  masterProperties,
  readMasterInput,
  richTextString,
  routineProperties,
} from './codec';
import {
  masterMarker,
  masterReadyMarker,
  type MasterGateway,
  type MasterTable,
  type MasterValue,
} from './models';
const blockSchema = z.object({
  id: z.string(),
  type: z.string(),
  child_database: z.object({ title: z.string() }).optional(),
});
const sourceSchema = z.object({
  id: z.string(),
  in_trash: z.boolean().optional(),
  description: z.unknown().optional(),
  properties: z.record(z.string(), z.object({ type: z.string() })),
});
const rowSchema = z.object({
  id: z.string(),
  in_trash: z.boolean().optional(),
  created_time: z.iso.datetime(),
  properties: z.record(z.string(), z.unknown()),
});
export class HttpMasterGateway implements MasterGateway {
  constructor(
    private client: NotionClient,
    private rootPageId: string,
  ) {}
  async readRoutines(): Promise<MasterTable> {
    await this.client.call(`pages/${this.rootPageId}`);
    const children = z
      .array(blockSchema)
      .parse(await this.client.all(`blocks/${this.rootPageId}/children`));
    const matches = children.filter(
      (block) =>
        block.type === 'child_database' &&
        block.child_database?.title === 'Routines',
    );
    if (matches.length > 1)
      throw new Error(
        'More than one Routines database exists. Sync stopped to protect routine identity.',
      );
    let databaseId = matches[0]?.id;
    if (!databaseId) {
      databaseId = z.object({ id: z.string() }).parse(
        await this.client.call('databases', 'POST', {
          parent: { type: 'page_id', page_id: this.rootPageId },
          title: [{ type: 'text', text: { content: 'Routines' } }],
          initial_data_source: { properties: masterProperties },
        }),
      ).id;
      // A failed create is never retried blindly; a subsequent sync finds this database.
      const db = z
        .object({
          data_sources: z.array(z.object({ id: z.string() })).length(1),
        })
        .parse(await this.client.call(`databases/${databaseId}`));
      await this.client.call(
        `data_sources/${db.data_sources[0]!.id}`,
        'PATCH',
        { description: [{ type: 'text', text: { content: masterMarker } }] },
      );
    }
    const database = z
      .object({
        data_sources: z.array(z.object({ id: z.string() })).length(1),
        in_trash: z.boolean().optional(),
      })
      .parse(await this.client.call(`databases/${databaseId}`));
    if (database.in_trash)
      throw new Error(
        'The Routines database is in the trash. Restore it before syncing.',
      );
    const dataSourceId = database.data_sources[0]!.id;
    const source = sourceSchema.parse(
      await this.client.call(`data_sources/${dataSourceId}`),
    );
    if (source.in_trash)
      throw new Error(
        'The Routines data source is in the trash. Restore it before syncing.',
      );
    for (const [name, settings] of Object.entries(masterProperties)) {
      if (source.properties[name]?.type !== Object.keys(settings)[0])
        throw new Error(
          `Restore the ${name} property in the Routines database. No local data was removed.`,
        );
    }
    const description = source.description
      ? richTextString(source.description)
      : '';
    // An empty marker is a recoverable create interrupted before writing its description.
    if (description && !description.startsWith(masterMarker))
      throw new Error(
        'The Routines database is not a RoutineLog master database. It has not been changed.',
      );
    const rows: MasterTable['rows'] = [];
    for (const raw of await this.client.all(
      `data_sources/${dataSourceId}/query`,
      'POST',
    )) {
      const row = rowSchema.parse(raw);
      if (row.in_trash) continue;
      // Rich text properties may be truncated by Notion's row query.
      for (const [name, rawProperty] of Object.entries(row.properties)) {
        const prop = z
          .object({
            id: z.string(),
            type: z.string(),
            rich_text: z.array(z.unknown()).optional(),
            title: z.array(z.unknown()).optional(),
          })
          .parse(rawProperty);
        const parts = prop.rich_text ?? prop.title;
        if (!parts || parts.length < 25) continue;
        let propertyId = prop.id;
        try {
          propertyId = decodeURIComponent(propertyId);
        } catch {
          /* Encode a raw ID as-is. */
        }
        const all = await this.client.all(
          `pages/${row.id}/properties/${encodeURIComponent(propertyId)}`,
        );
        row.properties[name] = {
          ...prop,
          [prop.type]: all.map(
            (part) => z.record(z.string(), z.unknown()).parse(part)[prop.type],
          ),
        };
      }
      const parsed = readMasterInput(row.properties, row.id);
      if (rows.some((item) => item.routineId === parsed.routineId))
        throw new Error(
          'Duplicate Routine ID in the Routines database. Keep each ID unique; no routine was removed.',
        );
      rows.push({
        pageId: row.id,
        ...parsed,
        createdDate: localDate(new Date(row.created_time)),
      });
    }
    return {
      databaseId,
      dataSourceId,
      initialized: description.startsWith(masterReadyMarker),
      rows,
    };
  }
  async writeRoutine(
    table: MasterTable,
    routineId: string,
    value: MasterValue,
    pageId?: string,
  ): Promise<string> {
    const properties = routineProperties(routineId, value);
    const response = await this.client.call(
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
        properties,
      },
    );
    return z.object({ id: z.string() }).parse(response).id;
  }
  async finishRoutineMigration(table: MasterTable): Promise<void> {
    await this.client.call(`data_sources/${table.dataSourceId}`, 'PATCH', {
      description: [
        {
          type: 'text',
          text: {
            content: `${masterReadyMarker}\nEdit routines here. Monthly tables hold daily results and notes. Checklist: one step per line. Dates are inclusive.`,
          },
        },
      ],
    });
  }
}
