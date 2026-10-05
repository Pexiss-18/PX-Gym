import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { MODO_MOCK, desligadoNoMock } from "@/lib/modo";
import * as schema from "./schema";

function abrir() {
  // enableChangeListener liga o suporte a useLiveQuery (telas reativas, etapa 5).
  const sqlite = openDatabaseSync("pxgym.db", {
    enableChangeListener: true,
  });
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof abrir>;

// No modo mock o arquivo pxgym.db nem é aberto.
export const db: Db = MODO_MOCK ? desligadoNoMock<Db>("O SQLite") : abrir();
