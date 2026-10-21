import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Where attachment bytes live. Keys are server-generated UUIDs, never user input. */
export type AttachmentStore = {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
};

const keyPattern = /^[0-9a-f-]{36}$/;
function assertKey(key: string) {
  if (!keyPattern.test(key)) throw new Error("invalid_attachment_key");
}

/** Local disk store for development and single-server installs; ATTACHMENTS_DIR overrides the folder. */
export function localDiskStore(root = process.env.ATTACHMENTS_DIR || path.join(process.cwd(), ".local", "attachments")): AttachmentStore {
  const file = (key: string) => { assertKey(key); return path.join(root, key.slice(0, 2), key); };
  return {
    async put(key, bytes) { const target = file(key); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: "wx" }); },
    async get(key) { const target = file(key); try { return new Uint8Array(await readFile(target)); } catch { return null; } },
    async delete(key) { await rm(file(key), { force: true }); },
  };
}

let store: AttachmentStore | undefined;
/** Single place to swap in another backend (e.g. S3-compatible) without touching callers. */
export function getAttachmentStore() {
  store ??= localDiskStore();
  return store;
}
