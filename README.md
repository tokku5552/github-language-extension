# GitHub Language Extension

GitHub Language Stats Extension(Chrome Extension)

![image](docs/image.png)

## Prerequisites

- versions

| runtime |version|
|--|---|
|node|v18.12.1|
|npm|8.19.2|
|yarn|1.22.19|

## Option

- [Visual Studio Code](https://code.visualstudio.com/)

## Setup

```bash:
yarn install
```

## Build

```bash:
yarn build
```

## Build in watch mode

```bash:
yarn watch
```

- delete webpack cache

```bash:
yarn cache clean
```

## Connecting a GitHub account (optional)

The extension reads stats straight from the GitHub API. Without credentials it
uses the anonymous REST API, which is limited to 60 requests per hour per IP
address and cannot report commits, PRs, issues or rank. Connecting an account
switches it to the GraphQL API, which raises the limit to 5,000 requests per
hour and restores the full card.

The options page offers two ways to connect.

### Sign in with GitHub (device flow)

This is the path most users should take, but it only appears once the repository
owner has registered an OAuth App:

1. Create an OAuth App at <https://github.com/settings/developers>.
2. Enable **Device flow** in the app's settings.
3. Put its client ID in `GITHUB_OAUTH_CLIENT_ID` in
   [`src/config.ts`](src/config.ts) and rebuild.

A client ID is public by design - it ships inside the extension and needs no
client secret, because the device flow does not use one. While the constant is
empty the sign-in button stays hidden and only the manual token field is shown.

No scopes are requested (`GITHUB_OAUTH_SCOPE` is empty), so GitHub's consent
screen says only that the app identifies the user. That is enough for every
public statistic the extension displays. Adding `repo` would include private
contributions at the cost of the "full control of private repositories" prompt.

### Personal access token

A user can also paste a token directly. A classic token needs no scopes for
public data; adding `repo` includes that user's private contributions.

Either way the credential is stored in `chrome.storage.local` and is only ever
sent to `api.github.com`.

## Load extension to chrome

Load `dist` directory

## Test

`npx jest` or `yarn test`
