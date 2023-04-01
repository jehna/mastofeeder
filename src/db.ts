import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { DATABASE_FILENAME } from "./env";

export const openDb = async () => {
  const conn = await open({
    filename: DATABASE_FILENAME,
    driver: sqlite3.Database,
  });
  return conn;
};

const migrate = async () => {
  const db = await openDb();
  await db.migrate();
};
migrate();
