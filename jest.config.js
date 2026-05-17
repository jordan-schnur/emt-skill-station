module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  collectCoverageFrom: [
    "js/**/*.js",
    "!js/data.js",        // generated file
    "!js/app.js",         // main app file - coverage in progress
    "!js/marked.min.js",  // vendor library
  ],
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/?(*.)test.js",
    "**/tests/**/*.test.js",
    "**/tests/**/*.e2e.test.js",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.claude/",
    "tests/setup.js",
    "tests/fixtures.js",
    "tests/e2e/*.spec.js",
  ],
  coverageThreshold: {
    global: {
      branches: 42,
      functions: 36,
      lines: 46,
      statements: 44,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
