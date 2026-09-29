const path = require("node:path");

/**
 * Dois projetos Jest:
 *
 * - "adapters": repositórios Drizzle, gateways e sessão segura em Node puro
 *   com ts-jest. Módulos nativos do Expo entram via jest.mock e o SQLite é o
 *   node:sqlite real.
 * - "telas": Context API, hooks e telas com jest-expo + React Native Testing
 *   Library (render / fireEvent), com use cases fakes injetados.
 *
 * @type {import('jest').Config}
 */
const moduleNameMapper = {
  "^@/(.*)$": "<rootDir>/src/$1",
  "^@px/core$": "<rootDir>/../../packages/core/src/index.ts",
  "^@px/core/testing/(.*)$": "<rootDir>/../../packages/core/src/testing/$1",
};

module.exports = {
  // Cobertura da fase "Domínio e Interface primeiro": a camada de adapters
  // (Context, sessão segura, hooks, gateways, telas, memória). O domínio e
  // os use cases são medidos no packages/core. instancia.ts só liga o app
  // real (Supabase/SecureStore de verdade) e não roda em teste.
  collectCoverageFrom: [
    "src/adapters/**/*.{ts,tsx}",
    "!src/adapters/**/__tests__/**",
    "!src/adapters/instancia.ts",
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
  projects: [
    {
      displayName: "adapters",
      testEnvironment: "node",
      roots: ["<rootDir>/src"],
      testMatch: ["**/__tests__/**/*.test.ts"],
      transform: {
        "^.+\.tsx?$": [
          "ts-jest",
          {
            // O tsconfig do app é pro Metro (module: preserve); aqui é CommonJS.
            // Tipos são conferidos pelo `tsc` do app, então só transpila.
            tsconfig: {
              // raiz do monorepo: os testes também compilam o packages/core
              rootDir: path.resolve(__dirname, "../.."),
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
      moduleNameMapper,
    },
    {
      displayName: "telas",
      preset: "jest-expo",
      roots: ["<rootDir>/src"],
      testMatch: ["**/__tests__/**/*.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/src/adapters/__tests__/utils/setup-telas.ts"],
      moduleNameMapper: {
        ...moduleNameMapper,
        // O web (raiz do monorepo) usa React 19.3; o app, 19.2 (versão do
        // Expo). Sem isso o renderizador de teste pega uma cópia e as telas
        // outra, e todo hook quebra com "Cannot read properties of null".
        "^react$": "<rootDir>/node_modules/react",
        "^react/(.*)$": "<rootDir>/node_modules/react/$1",
        "^test-renderer$": "<rootDir>/node_modules/test-renderer",
      },
    },
  ],
};
