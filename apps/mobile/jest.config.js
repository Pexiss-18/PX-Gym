/**
 * Testes dos adapters do mobile (repositórios Drizzle, gateways de GPS e
 * rede). Roda em Node puro com ts-jest — módulos nativos do Expo entram via
 * jest.mock e o SQLite é o node:sqlite real. Telas ficam fora: sem jest-expo.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // O tsconfig do app é pro Metro (module: preserve); aqui é CommonJS.
        // Tipos são conferidos pelo `tsc` do app, então só transpila.
        tsconfig: {
          // raiz do monorepo: os testes também compilam o packages/core
          rootDir: require("node:path").resolve(__dirname, "../.."),
          module: "commonjs",
          moduleResolution: "node10",
          ignoreDeprecations: "6.0",
          target: "ES2022",
          esModuleInterop: true,
          isolatedModules: true,
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@px/core$": "<rootDir>/../../packages/core/src/index.ts",
  },
};
