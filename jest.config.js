module.exports = {
  moduleFileExtensions: ['ts', 'tsx' ,'js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json',
    },
  },
  testMatch: ['**/test/**/*.test.(ts|tsx)'],
  testEnvironment: 'jest-environment-jsdom'
};
