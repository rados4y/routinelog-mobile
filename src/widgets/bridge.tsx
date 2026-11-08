export const isWidgetAvailable = () => false;
export async function refreshWidgets(
  notice?: string,
  excludeWidgetId?: number,
): Promise<void> {
  void notice;
  void excludeWidgetId;
}
export async function pinTodayWidget(): Promise<boolean> {
  return false;
}
// Keep this extension aligned with bridge.android.tsx. Metro resolves .ts before
// .tsx, so bridge.ts would hide the Android bridge even in an Android export.
