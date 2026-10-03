export function readCache<T>(key: string): { data: T; at: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data !== undefined) return parsed as { data: T; at: number };
    return null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, at: Date.now() }));
  } catch {
    // storage full/disabled — ignore
  }
}