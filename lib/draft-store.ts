import type { Device } from "./catalog-tools";
export type LocalDraft = {
  key: string;
  uid: string;
  type: string;
  item: Device;
  at: string;
};
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("tech-explorer-drafts", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("drafts", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function request<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", mode),
      r = action(tx.objectStore("drafts"));
    tx.oncomplete = () => {
      resolve(r.result);
      db.close();
    };
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
    tx.onabort = () => {
      reject(tx.error);
      db.close();
    };
  });
}
export const draftKey = (uid: string, type: string, id: string) =>
  `${uid}:${type}:${id}`;
export const saveLocalDraft = (draft: LocalDraft) =>
  request("readwrite", (s) => s.put(draft));
export const deleteLocalDraft = (key: string) =>
  request("readwrite", (s) => s.delete(key));
export async function listLocalDrafts(uid: string) {
  return (await request<LocalDraft[]>("readonly", (s) => s.getAll()))
    .filter((x) => x.uid === uid)
    .sort((a, b) => b.at.localeCompare(a.at));
}
