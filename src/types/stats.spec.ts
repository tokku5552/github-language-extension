import { StatsErrorType } from './enums';
import { StatsError } from './stats';

describe('StatsError', () => {
  // github.ts, popup.tsx and options.tsx all branch on `instanceof StatsError`
  // to tell a classified failure from an unexpected one. Native `class
  // extends Error` preserves this at this project's es6 compile target
  // without help, but pin it so a future target downgrade (or a change to
  // ts-jest's isolated-modules settings) that silently broke it would fail a
  // test instead of surfacing as a misrouted error message.
  test('is recognized by instanceof through Error and unknown', () => {
    const caught: unknown = new StatsError(StatsErrorType.NETWORK, 'offline');

    expect(caught instanceof StatsError).toBe(true);
    expect(caught instanceof Error).toBe(true);
  });

  test('carries its fields', () => {
    const resetAt = new Date('2026-01-01T00:00:00Z');
    const error = new StatsError(
      StatsErrorType.RATE_LIMITED,
      'limited',
      resetAt
    );

    expect(error.type).toBe(StatsErrorType.RATE_LIMITED);
    expect(error.message).toBe('limited');
    expect(error.resetAt).toBe(resetAt);
    expect(error.name).toBe('StatsError');
  });
});
