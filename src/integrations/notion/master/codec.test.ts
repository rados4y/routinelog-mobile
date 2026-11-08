import { describe, expect, it, vi } from 'vitest';
import { routine } from '../../../test/fixtures';
import type { Schedule } from '../../../domain/models';
import { NotionClient, type NotionFetch } from '../client';
import { HttpMasterGateway } from './gateway';
import { masterMarker, masterReadyMarker } from './models';
import { masterProperties, readMasterInput, routineProperties } from './codec';
import { frequencyText, parseFrequency } from './frequency';
import { valueFromRoutine } from './sync';

const withTypes = (raw: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(raw).map(([name, prop]) => [
      name,
      { id: name, type: Object.keys(prop as object)[0], ...(prop as object) },
    ]),
  );
const responseRow = () => ({
  id: 'page',
  created_time: '2026-11-08T12:00:00.000Z',
  properties: withTypes(
    routineProperties('test-routine', valueFromRoutine(routine())),
  ),
});

describe('master Notion schema and encoding', () => {
  it('round trips every schedule with readable English fields and accepts legacy schedules', () => {
    const schedules: Schedule[] = [
      { kind: 'daily' },
      { kind: 'weekdays', days: [1, 3, 5] },
      { kind: 'weekdays', days: [2, 4], flexible: true },
      { kind: 'weeklyTarget', count: 3 },
      { kind: 'monthlyTarget', count: 5 },
      { kind: 'interval', every: 30, anchor: '2026-11-01' },
      { kind: 'monthlyDays', days: [15], lastDay: true, flexible: true },
      {
        kind: 'monthlyWeekdays',
        weeks: [],
        lastWeek: true,
        days: [1],
        flexible: false,
      },
      { kind: 'yearlyDates', dates: [{ day: 29, month: 2 }], flexible: false },
    ];
    for (const schedule of schedules)
      expect(parseFrequency(frequencyText(schedule))).toEqual(schedule);
    expect(parseFrequency('codziennie')).toEqual({ kind: 'daily' });
    expect(parseFrequency('Monday–Friday')).toEqual({
      kind: 'weekdays',
      days: [1, 2, 3, 4, 5],
    });
    for (const value of [
      '0x/week',
      'Weekly days: Moon',
      'Monthly days: 33',
      'Monthly days: 0, last',
      'Yearly dates: 30.2',
    ])
      expect(() => parseFrequency(value)).toThrow();
  });
  it('preserves long descriptions, multi-line checklist steps, blanks and dates without column-description limits', () => {
    const value = valueFromRoutine({
      ...routine(),
      note: '💛'.repeat(500),
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      checklist: [
        { id: 'one', text: 'Step with \\ and\nnew line' },
        { id: 'two', text: 'Second step' },
      ],
    });
    const decoded = readMasterInput(
      withTypes(routineProperties('stable-id', value)),
      'page',
    );
    expect(decoded.input).toMatchObject({
      note: value.note,
      startDate: value.startDate,
      endDate: value.endDate,
    });
    expect(decoded.input.checklist?.map((item) => item.text)).toEqual(
      value.checklist.map((item) => item.text),
    );
    expect(decoded.routineId).toBe('stable-id');
    const blank = readMasterInput(
      withTypes(
        routineProperties('stable-id', {
          ...value,
          note: '',
          checklist: [],
          endDate: null,
        }),
      ),
      'page',
    );
    expect(blank.input).toMatchObject({
      note: '',
      checklist: [],
      endDate: null,
    });
  });
  it('flags blank IDs for write-back and ignores spacing between checklist steps', () => {
    const props = withTypes(
      routineProperties('stable-id', valueFromRoutine(routine())),
    );
    const decoded = readMasterInput(
      {
        ...props,
        'Routine ID': { type: 'rich_text', rich_text: [] },
        Checklist: {
          type: 'rich_text',
          rich_text: [{ text: { content: '\nFirst step\n\nSecond step\n' } }],
        },
      },
      'fresh-page',
    );
    expect(decoded.needsIdentityWrite).toBe(true);
    expect(decoded.routineId).toBe('notion-fresh-page');
    expect(decoded.input.checklist?.map((step) => step.text)).toEqual([
      'First step',
      'Second step',
    ]);
  });
  it('rejects a malformed schema or invalid dates instead of treating a row as deleted', () => {
    const props = withTypes(
      routineProperties('stable-id', valueFromRoutine(routine())),
    );
    expect(() =>
      readMasterInput(
        { ...props, Active: { type: 'rich_text', rich_text: [] } },
        'page',
      ),
    ).toThrow('Active');
    expect(() =>
      readMasterInput(
        {
          ...props,
          'End date': { type: 'date', date: { start: '2020-01-01' } },
        },
        'page',
      ),
    ).toThrow('End date');
  });
  it('reads all routine pages using the data-source API and rejects duplicate identities', async () => {
    const source = {
      id: 'source',
      description: [{ plain_text: masterReadyMarker }],
      properties: withTypes(masterProperties),
    };
    const request = vi.fn<NotionFetch>().mockImplementation(async (url) => {
      if (url.includes('blocks/root/children'))
        return Response.json({
          results: [
            {
              id: 'db',
              type: 'child_database',
              child_database: { title: 'Routines' },
            },
          ],
          has_more: false,
          next_cursor: null,
        });
      if (url.endsWith('databases/db'))
        return Response.json({ data_sources: [{ id: 'source' }] });
      if (url.endsWith('data_sources/source')) return Response.json(source);
      if (url.endsWith('/query'))
        return Response.json({
          results: [responseRow()],
          has_more: false,
          next_cursor: null,
        });
      return Response.json({ id: 'root' });
    });
    const gateway = new HttpMasterGateway(
      new NotionClient('fake', request, async () => {}),
      'root',
    );
    const table = await gateway.readRoutines();
    expect(table.initialized).toBe(true);
    expect(table.rows[0]).toMatchObject({
      routineId: 'test-routine',
      input: { name: routine().name },
      createdDate: '2026-11-08',
    });
    await gateway.writeRoutine(
      table,
      'test-routine',
      valueFromRoutine(routine()),
      'page',
    );
    const patch = request.mock.calls.find(
      ([, init]) => init.method === 'PATCH',
    );
    expect(patch?.[0]).toBe('https://api.notion.com/v1/pages/page');
    expect(JSON.parse(String(patch?.[1].body))).toHaveProperty(
      'properties.Checklist',
    );
    request.mockImplementation(async (url) => {
      if (url.endsWith('/query'))
        return Response.json({
          results: [responseRow(), { ...responseRow(), id: 'duplicate' }],
          has_more: false,
          next_cursor: null,
        });
      if (url.includes('blocks/root/children'))
        return Response.json({
          results: [
            {
              id: 'db',
              type: 'child_database',
              child_database: { title: 'Routines' },
            },
          ],
          has_more: false,
          next_cursor: null,
        });
      if (url.endsWith('databases/db'))
        return Response.json({ data_sources: [{ id: 'source' }] });
      if (url.endsWith('data_sources/source')) return Response.json(source);
      return Response.json({ id: 'root' });
    });
    await expect(gateway.readRoutines()).rejects.toThrow(
      'Duplicate Routine ID',
    );
    expect(masterMarker).toBe('RoutineLog routines (v2)');
  });
});
