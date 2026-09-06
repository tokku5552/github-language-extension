/**
 * Client ID of the GitHub OAuth App used for the sign-in button.
 *
 * Register an OAuth App at https://github.com/settings/developers, enable
 * "Device flow" in its settings, and paste the client ID here. A client ID is
 * public by design - it ships in the extension and needs no client secret,
 * because the device flow does not use one.
 *
 * While this is empty the sign-in button is hidden and the options page offers
 * only the manual personal access token field.
 */
// `as string` keeps the type wide. Without it TypeScript infers the literal
// type '' and every `=== ''` check below becomes a compile error the moment a
// real client ID is filled in.
export const GITHUB_OAUTH_CLIENT_ID = '' as string;

/**
 * Scopes requested during sign-in.
 *
 * Empty on purpose: the GraphQL API needs authentication for access and for a
 * usable rate limit, not scopes, as long as only public data is read. Keeping
 * this empty means the consent screen says the app only identifies the user,
 * which is the whole point of preferring sign-in over a hand-made token. Adding
 * `repo` here would include private contributions at the cost of the "full
 * control of private repositories" consent prompt.
 */
export const GITHUB_OAUTH_SCOPE = '' as string;
