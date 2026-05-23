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
}

export default config
