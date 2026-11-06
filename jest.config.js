module.exports = {
  preset: 'ts-jest',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src/middleware/**/*.ts', 'src/utils/**/*.ts', 'src/services/statsAggregator.ts', 'src/exporters/**/*.ts']
};
