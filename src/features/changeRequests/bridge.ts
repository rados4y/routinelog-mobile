import { z } from 'zod';
import {
  changeDraftSchema,
  restoreChangeDraft,
  type ChangeDraft,
} from './model';
import { guideHtml } from './generated/guide';
export const guideChannel = 'routinelog-change-guide';
export const guideMessageSchema = z.discriminatedUnion('type', [
  z.object({
    channel: z.literal(guideChannel),
    type: z.literal('draft'),
    draft: changeDraftSchema,
  }),
  z.object({
    channel: z.literal(guideChannel),
    type: z.literal('copy'),
    draft: changeDraftSchema,
  }),
]);
export function guideDocument(
  draft: ChangeDraft,
  appVersion: string,
  host: 'native' | 'web',
  parentOrigin?: string,
): string {
  const value = JSON.stringify({
    draft: restoreChangeDraft(draft),
    appVersion,
    host,
    parentOrigin,
  })
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  return guideHtml.replace(
    /(<script type="application\/json" id="bootstrap">)[\s\S]*?(<\/script>)/,
    (_, start: string, end: string) => `${start}${value}${end}`,
  );
}
