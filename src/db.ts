import { open } from "sqlite";
import sqlite3 from "sqlite3";

export const openDb = async () => {
  const conn = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });
  return conn;
};

const migrate = async () => {
  const db = await openDb();
  await db.migrate();
};
migrate();
