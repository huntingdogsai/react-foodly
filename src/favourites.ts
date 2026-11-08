// Favourites belong to the signed-in account and are kept ON THE DEVICE, so they survive a reload —
// stored in localStorage, keyed by user. This is the client-side persistence a QA run verifies: the UI
// can show a favourite while storage is empty if the save was dropped.
const KEY = 'foodly.favourites';

function keyFor(userId: string): string {
  return `${KEY}.${userId}`;
}

export function loadFavourites(userId: string): string[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavourites(userId: string, ids: string[]): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(ids));
  } catch {
    /* storage can be unavailable (private window); the UI still works for the session */
  }
}
