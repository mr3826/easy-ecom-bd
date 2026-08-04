/**
 * Next writes `__NEXT_PRIVATE_ORIGIN` from the address the server listened on
 * (start-server.js). Passenger replaces the TCP listener with a Unix socket, so
 * `server.address()` returns a string, the `0.0.0.0 -> localhost` normalisation
 * is skipped, and the origin becomes `http://0.0.0.0:3000`. Server actions that
 * call `redirect()` self-fetch that origin to stream the redirect and die with
 * ECONNREFUSED, which surfaces to the browser as "Connection closed" — a
 * successful login looks exactly like a failed one.
 *
 * Re-point the origin at APP_URL once startServer has resolved, which is after
 * start-server has written its own value.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const serverFile = join(process.cwd(), ".next", "standalone", "server.js");
const anchor = "}).catch((err) => {";
const patch = `}).then(() => {
  const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (origin) process.env.__NEXT_PRIVATE_ORIGIN = new URL(origin).origin
}).catch((err) => {`;

const source = readFileSync(serverFile, "utf8");

if (source.includes("__NEXT_PRIVATE_ORIGIN")) {
  console.log("standalone server.js already patched");
  process.exit(0);
}

if (!source.includes(anchor)) {
  throw new Error(
    `Could not find the startServer() call in ${serverFile}. Next's standalone ` +
      `output changed shape — re-check the redirect origin fix before deploying.`,
  );
}

writeFileSync(serverFile, source.replace(anchor, patch));
console.log("Patched standalone server.js to use APP_URL as the redirect origin");
