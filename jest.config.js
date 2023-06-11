module.exports = {
  moduleFileExtensions: ['ts', 'tsx' ,'js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsConfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    "@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ['**/*.spec.(ts|tsx)'],
  testEnvironment: 'jest-environment-jsdom'
};
