const PANEL_PATH = "/painel/";

export function getPanelUrl(params?: Record<string, string>) {
  const url = new URL(PANEL_PATH, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export function clearAuthUrl() {
  window.history.replaceState({}, document.title, PANEL_PATH);
}
