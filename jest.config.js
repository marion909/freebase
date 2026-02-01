module.exports = {
  displayName: 'backend',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/backend/src/**/*.(t|j)s',
    '!apps/backend/src/main.ts',
    '!apps/backend/src/**/*.module.ts',
  ],
  coverageDirectory: '../coverage/backend',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/backend', '<rootDir>/packages'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/backend/src/$1',
    '^@freebase/types$': '<rootDir>/packages/types/src',
    '^@freebase/shared$': '<rootDir>/packages/shared/src',
  },
};
