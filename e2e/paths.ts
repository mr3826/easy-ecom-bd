import path from "node:path";

/** Shared session written by auth.setup.ts and consumed by the admin specs. */
export const ADMIN_STATE = path.join(__dirname, ".auth", "admin.json");
