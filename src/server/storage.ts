import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
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
    const normalizedKey = key.trim().replace(/^\/+/, "");
    if (!normalizedKey) return;

    const rootPath = path.resolve(this.rootDir);
    const absolutePath = path.resolve(rootPath, normalizedKey);
    const relativePath = path.relative(rootPath, absolutePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return;
    }

    await unlink(absolutePath).catch((error: unknown) => {
      if (error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    });
  }
}

let storage: FileStorage | null = null;

export function getStoredUploadKey(url: string) {
  const trimmed = url.trim();
  if (!trimmed.startsWith("/uploads/")) return null;
  return decodeURIComponent(trimmed.slice("/uploads/".length).replace(/^\/+/, ""));
}

export async function deleteStoredUploadFile(url: string) {
  const key = getStoredUploadKey(url);
  if (!key) return;
  await getFileStorage().delete(key);
}

export function getFileStorage() {
  if (!storage) storage = new LocalFileStorage();
  return storage;
}

export function resetFileStorageForTests() {
  storage = null;
}
