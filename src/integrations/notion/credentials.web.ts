// No fallback to localStorage: the browser preview must never persist a Notion credential.
export const credentials = {
  get: async (): Promise<string | null> => null,
  set: async (_token: string): Promise<void> => {
    throw new Error('Notion connection is available in the mobile app.');
  },
  remove: async (): Promise<void> => {},
};
export const supportsNotionConnection = false;
