import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface StoredFile {
  key: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface FileStorage {
  save(file: File, folder: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

class LocalFileStorage implements FileStorage {
  constructor(private readonly rootDir = process.env.UPLOAD_DIR || "/uploads") {}

  async save(file: File, folder: string): Promise<StoredFile> {
    const ext = path.extname(file.name || "").toLowerCase();
    const safeName = (file.name || "upload").replace(/[^a-z0-9._-]+/gi, "-");
    const fileName = `${randomUUID()}-${safeName || "file"}${ext && !safeName.endsWith(ext) ? ext : ""}`;
    const relativePath = path.join(folder, fileName).replaceAll("\\", "/");
    const absolutePath = path.join(this.rootDir, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);
    return {
      key: relativePath,
      url: `/uploads/${relativePath}`,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    };
  }

  async delete(key: string) {
    // Local development keeps files on disk. Cleanup can be added when deletion flows need it.
    void key;
  }
}

let storage: FileStorage | null = null;

export function getFileStorage() {
  if (!storage) storage = new LocalFileStorage();
  return storage;
}

