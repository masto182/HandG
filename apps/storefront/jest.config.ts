import type { Config } from "jest"

const config: Config = {
  testEnvironment: "jsdom",
  // Runs after Jest framework is loaded; used to extend expect with jest-dom matchers.
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.spec.{ts,tsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/e2e/"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true, decorators: false },
          transform: { react: { runtime: "automatic" } },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^server-only$": "<rootDir>/src/lib/__mocks__/server-only.ts",
    "\\.(css|scss|sass)$": "<rootDir>/src/lib/__mocks__/style-mock.ts",
  },
  clearMocks: true,
  // Coverage ratchet (enforced only when CI runs with --coverage): thresholds
  // sit just below the measured baseline (stmts 87.6 / branch 80.9 /
  // funcs 88.9 / lines 90.5) so component-test coverage cannot silently erode.
  // Default collection (files exercised by tests) is intentional — scoping to
  // all of src/** would pull in untested RSC pages and make the floor trivial.
  coverageThreshold: {
    global: {
      statements: 83,
      branches: 75,
      functions: 83,
      lines: 85,
    },
  },
}

export default config
