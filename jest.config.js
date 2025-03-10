module.exports = {
  testEnvironment: 'node',
  verbose: true,
  maxConcurrency: 1,
  testTimeout: 50000,
  roots: [
    '<rootDir>/tests',
  ],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: [
    './tests/setup.ts',
  ],
};
