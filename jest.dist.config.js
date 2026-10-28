// Runs src/dist.smoke.ts against the output of `yarn build`; see that file.
module.exports = {
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: ['**/src/dist.smoke.ts'],
  testEnvironment: 'node',
};
