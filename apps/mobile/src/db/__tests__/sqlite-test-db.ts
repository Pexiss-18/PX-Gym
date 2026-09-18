import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "../schema";
import type { Db } from "../index";

/*
 * SQLite de verdade pros testes dos repositórios: node:sqlite (embutido no
 * Node 22.5+) em memória, com as MESMAS migrations que o app aplica no boot,
 * ligado ao Drizzle pelo driver sqlite-proxy. O query builder é o mesmo do
 * expo-sqlite, então o SQL testado é o SQL que roda no aparelho.
 */

type Row = Record<string, unknown>;
type Statement = {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): Row | undefined;
  all(...params: unknown[]): Row[];
};
type DatabaseSync = {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
};

const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "drizzle");

export function createTestDb(): { db: Db; close(): void } {
  // getBuiltinModule contorna o resolver do Jest, que não conhece node:sqlite.
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as {
    DatabaseSync: new (path: string) => DatabaseSync;
  };
  const sqlite = new DatabaseSync(":memory:");

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) sqlite.exec(statement);
    }
  }

  const db = drizzle(
    async (sql, params, method) => {
      const statement = sqlite.prepare(sql);
      if (method === "run") {
        statement.run(...params);
        return { rows: [] };
      }
      if (method === "get") {
        // sqlite-proxy: "get" devolve UMA linha (ou undefined se não houver)
        const row = statement.get(...params);
        return { rows: (row ? Object.values(row) : undefined) as unknown[] };
      }
      return { rows: statement.all(...params).map((r) => Object.values(r)) };
    },
    { schema },
  );

  return { db: db as unknown as Db, close: () => sqlite.close() };
}
