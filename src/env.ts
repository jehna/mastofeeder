import fs from "fs";

export const serverHostname = process.env.SERVER_HOSTNAME!;
export const DATABASE_FILENAME =
  process.env.DATABASE_FILENAME ?? "./database.db";
export const PORT = process.env.PORT ?? 3000;
export const PUBLIC_KEY =
  process.env.PUBLIC_KEY?.split(String.raw`\n`).join("\n") ??
  fs.readFileSync("./public.pem").toString();
export const PRIVATE_KEY =
  process.env.PRIVATE_KEY?.split(String.raw`\n`).join("\n") ??
  fs.readFileSync("./private.pem").toString();
