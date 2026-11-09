import { useEffect, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { guideDocument, guideMessageSchema } from './bridge';
import type { ChangeDraft } from './model';
import { changeRequestStore } from '../../store/useChangeRequests';
export function GuideView({ initialDraft }: { initialDraft: ChangeDraft }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [initial] = useState(initialDraft);
  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const html = useMemo(
    () =>
      guideDocument(
        initial,
        appVersion,
        'web',
        typeof window === 'undefined' ? '' : window.location.origin,
      ),
    [appVersion, initial],
  );
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== window.location.origin
      )
        return;
      const parsed = guideMessageSchema.safeParse(event.data);
      if (parsed.success && parsed.data.type === 'draft')
        changeRequestStore.getState().save(parsed.data.draft);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return (
    <iframe
      ref={frame}
      title="Interactive change guide"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-forms"
      allow="clipboard-write"
      style={{
        border: 0,
        width: '100%',
        height: '100%',
        flex: 1,
        background: '#0c0e10',
      }}
    />
  );
}
