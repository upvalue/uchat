const STORAGE_KEY = "uchat-config";

export interface Config {
  serverUrl: string;
  username: string;
}

export function getConfig(): Config | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setConfig(config: Config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}
