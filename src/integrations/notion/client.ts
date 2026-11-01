import { z } from 'zod';

const paginationSchema = z.object({
  results: z.array(z.unknown()),
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
});
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export type NotionFetch = (url: string, init: RequestInit) => Promise<Response>;

// Only this fixed HTTPS origin receives the user's token. Errors never echo bodies or credentials.
export class NotionClient {
  private lastRequest = 0;
  constructor(
    private token: string,
    private request: NotionFetch = fetch,
    private wait = pause,
  ) {}
  async call(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.wait(Math.max(0, 350 - (Date.now() - this.lastRequest)));
      this.lastRequest = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let response: Response;
      try {
        response = await this.request(`https://api.notion.com/v1/${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Notion-Version': '2026-03-11',
            'Content-Type': 'application/json',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: controller.signal,
        });
      } catch {
        throw new Error(
          'Nie można połączyć z Notion. Lokalne zmiany są bezpieczne. Spróbuj ponownie po odzyskaniu internetu.',
        );
      } finally {
        clearTimeout(timeout);
      }
      if (response.status === 429 && attempt < 2) {
        const seconds = Number(response.headers.get('retry-after') ?? 1);
        await this.wait(
          Math.min(
            30000,
            Math.max(1000, Number.isFinite(seconds) ? seconds * 1000 : 1000),
          ),
        );
        continue;
      }
      if (response.ok) return response.json();
      if (response.status === 401)
        throw new Error(
          'Token Notion wygasł lub jest nieprawidłowy. Połącz konto ponownie.',
        );
      if (response.status === 403 || response.status === 404)
        throw new Error(
          'Brak dostępu do strony RoutineLog w Notion. Sprawdź konto, uprawnienia tokenu i udostępnienie strony połączeniu.',
        );
      throw new Error(
        `Notion nie przyjął zmiany (${response.status}). Żadne dane lokalne nie zostały usunięte. Spróbuj ponownie.`,
      );
    }
    throw new Error('Notion chwilowo ogranicza zapytania. Spróbuj za chwilę.');
  }
  async all(path: string, method = 'GET'): Promise<unknown[]> {
    const result: unknown[] = [];
    let cursor: string | null = null;
    do {
      const endpoint =
        method === 'GET'
          ? `${path}?page_size=100${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ''}`
          : path;
      const page = paginationSchema.parse(
        await this.call(
          endpoint,
          method,
          method === 'GET'
            ? undefined
            : { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) },
        ),
      );
      result.push(...page.results);
      if (page.has_more && !page.next_cursor)
        throw new Error(
          'Niepełna odpowiedź Notion. Synchronizacja została przerwana.',
        );
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return result;
  }
}
