import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

// enableChangeListener liga o suporte a useLiveQuery (telas reativas, etapa 5).
export const sqlite = openDatabaseSync("pxgym.db", {
  enableChangeListener: true,
});

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
