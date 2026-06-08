const { loadEnv } = require("@medusajs/utils")
loadEnv("test", process.cwd())

module.exports = {
  transform: {
    "^.+\\.[jt]sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true, decorators: true },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            react: { runtime: "automatic" },
          },
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "tsx", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  setupFiles: ["./integration-tests/setup.js"],
}

if (process.env.TEST_TYPE === "integration:http") {
  module.exports.testMatch = ["**/integration-tests/http/*.spec.[jt]s"]
} else if (process.env.TEST_TYPE === "integration:modules") {
  module.exports.testMatch = ["**/src/modules/*/__tests__/**/*.[jt]s"]
} else if (process.env.TEST_TYPE === "unit") {
  // Run all unit specs. (Previously only 3 globs ran, so the other ~23 specs
  // silently rotted; they are now green and gated.)
  module.exports.testMatch = ["**/src/__tests__/unit/*.unit.spec.[jt]s"]
  // Coverage ratchet (enforced only when CI runs with --coverage): thresholds
  // sit just below the measured baseline (stmts 62.5 / branch 48.3 /
  // funcs 63.2 / lines 63.5) so coverage of the code unit tests exercise
  // cannot silently erode. Default collection (files loaded by tests) is
  // intentional — scoping to all of src/** would conflate integration-only-
  // covered code and make the floor meaningless.
  module.exports.coverageThreshold = {
    global: {
      statements: 58,
      branches: 43,
      functions: 58,
      lines: 58,
    },
  }
}
