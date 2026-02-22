import { STORAGE_KEYS } from "./constants";

export function saveFileTags(
  username: string,
  tags: Record<string, string>,
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.FILE_TAGS}_${username}_${slot}`
      : `${STORAGE_KEYS.FILE_TAGS}_${username}`;
    const existing = getFileTags(username, slot);
    const combined = { ...existing, ...tags };

    // Remove tags with empty values (unsetting tag)
    Object.keys(combined).forEach((k) => {
      if (!combined[k]) delete combined[k];
    });

    localStorage.setItem(key, JSON.stringify(combined));
  } catch (error) {
    console.error("Failed to save file tags:", error);
  }
}

export function getFileTags(
  username: string,
  slot?: string,
): Record<string, string> {
  try {
    const key = slot
      ? `${STORAGE_KEYS.FILE_TAGS}_${username}_${slot}`
      : `${STORAGE_KEYS.FILE_TAGS}_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return {};
    return JSON.parse(data) as Record<string, string>;
  } catch (error) {
    console.error("Failed to get file tags:", error);
    return {};
  }
}
