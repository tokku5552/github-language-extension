/**
 * The other api specs replace axios with a mock, so they cannot notice an axios
 * update that changes how requests are built or how responses and errors are
 * shaped. These tests keep axios and its browser XHR adapter (the one the
 * extension uses) real and answer from a local server instead of GitHub.
 */
import { StatsErrorType } from '@/types/enums';
import { StatsError } from '@/types/stats';
import axios from 'axios';
import http from 'http';
import { AddressInfo } from 'net';
import { pollForAccessToken, requestDeviceCode } from './deviceFlow';
import { fetchStatsWithGraphQl, fetchStatsWithRest } from './github';

interface RecordedRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

interface Reply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Drops the connection without answering, as an unreachable host would. */
  drop?: boolean;
}

/** Returns a reply, or `undefined` to leave the request hanging. */
type Handler = (request: RecordedRequest) => Reply | undefined;

let server: http.Server;
let base: string;
let interceptor: number;
let handler: Handler;
let requests: RecordedRequest[];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    // jsdom enforces CORS, as the extension page would without host_permissions.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'X-RateLimit-Remaining, X-RateLimit-Reset'
    );
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      res.setHeader(
        'Access-Control-Allow-Headers',
        req.headers['access-control-request-headers'] ?? ''
      );
      res.writeHead(204).end();
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const request = {
        method: req.method ?? '',
        url: req.url ?? '',
        headers: req.headers,
        body,
      };
      requests.push(request);
      const reply = handler(request);
      if (!reply) {
        return;
      }
      if (reply.drop) {
        req.socket.destroy();
        return;
      }
      res.writeHead(reply.status, {
        'Content-Type': 'application/json; charset=utf-8',
        ...reply.headers,
      });
      res.end(reply.body === undefined ? '' : JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve())
  );
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // The only seam: send GitHub-bound requests to the local server.
  interceptor = axios.interceptors.request.use((config) => ({
    ...config,
    url: config.url
      ?.replace('https://api.github.com', `${base}/api`)
      .replace('https://github.com', `${base}/web`),
  }));
});

afterAll(async () => {
  axios.interceptors.request.eject(interceptor);
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  requests = [];
  handler = () => ({ status: 500 });
});

const parseUrl = (url: string) => new URL(url, base);

describe('GitHub REST through real axios', () => {
  test('builds the request and parses the JSON reply', async () => {
    handler = ({ url }) =>
      parseUrl(url).pathname.endsWith('/repos')
        ? {
            status: 200,
            body: [{ fork: false, language: 'Go', stargazers_count: 3 }],
          }
        : {
            status: 200,
            body: { login: 'octo', name: null, public_repos: 1, followers: 2 },
          };

    const stats = await fetchStatsWithRest('octo cat');

    expect(stats).toMatchObject({
      username: 'octo',
      name: 'octo',
      stars: 3,
      followers: 2,
    });
    expect(stats.languages.map((l) => l.name)).toStrictEqual(['Go']);

    const [user, repos] = requests;
    expect(user.method).toBe('GET');
    expect(parseUrl(user.url).pathname).toBe('/api/users/octo%20cat');
    expect(user.headers['accept']).toBe('application/vnd.github+json');
    expect(user.headers['x-github-api-version']).toBe('2022-11-28');
    const query = parseUrl(repos.url).searchParams;
    expect(query.get('per_page')).toBe('100');
    expect(query.get('type')).toBe('owner');
    expect(query.get('page')).toBe('1');
  });

  test('reads the rate-limit headers off a real error response', async () => {
    handler = () => ({
      status: 403,
      body: { message: 'API rate limit exceeded' },
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': '1700000000',
      },
    });

    const error = await fetchStatsWithRest('octo').catch((e) => e);

    expect(error).toBeInstanceOf(StatsError);
    expect(error.type).toBe(StatsErrorType.RATE_LIMITED);
    expect(error.resetAt).toStrictEqual(new Date(1700000000 * 1000));
  });

  test('maps a 404 to a missing user', async () => {
    handler = () => ({ status: 404, body: { message: 'Not Found' } });

    await expect(fetchStatsWithRest('nope')).rejects.toMatchObject({
      type: StatsErrorType.NOT_FOUND,
    });
  });

  test('maps an unreachable host to a network error', async () => {
    handler = () => ({ status: 0, drop: true });

    await expect(fetchStatsWithRest('octo')).rejects.toMatchObject({
      type: StatsErrorType.NETWORK,
    });
  });
});

describe('GitHub GraphQL through real axios', () => {
  const user = {
    login: 'octo',
    name: 'Octo Cat',
    followers: { totalCount: 1 },
    contributionsCollection: {
      totalCommitContributions: 1,
      totalPullRequestReviewContributions: 0,
      restrictedContributionsCount: 0,
    },
    repositoriesContributedTo: { totalCount: 0 },
    pullRequests: { totalCount: 0 },
    issues: { totalCount: 0 },
    repositories: {
      totalCount: 1,
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [
        {
          stargazerCount: 4,
          languages: {
            edges: [{ size: 10, node: { name: 'Go', color: '#00ADD8' } }],
          },
        },
      ],
    },
  };

  test('posts the query as JSON with a bearer token', async () => {
    handler = () => ({ status: 200, body: { data: { user } } });

    const stats = await fetchStatsWithGraphQl('octo', 'secret');

    expect(stats).toMatchObject({ username: 'octo', stars: 4, commits: 1 });
    const [request] = requests;
    expect(request.method).toBe('POST');
    expect(parseUrl(request.url).pathname).toBe('/api/graphql');
    expect(request.headers['authorization']).toBe('bearer secret');
    expect(request.headers['content-type']).toMatch(/^application\/json/);
    const body = JSON.parse(request.body);
    expect(body.query).toContain('query userStats');
    expect(body.variables).toStrictEqual({ login: 'octo', after: null });
  });

  test('maps a 401 to a rejected token', async () => {
    handler = () => ({ status: 401, body: { message: 'Bad credentials' } });

    await expect(fetchStatsWithGraphQl('octo', 'bad')).rejects.toMatchObject({
      type: StatsErrorType.UNAUTHORIZED,
    });
  });
});

describe('Device flow through real axios', () => {
  test('sends JSON and reads the code pair', async () => {
    handler = () => ({
      status: 200,
      body: {
        device_code: 'dc',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      },
    });

    const code = await requestDeviceCode('client');

    expect(code).toStrictEqual({
      deviceCode: 'dc',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 5,
    });
    const [request] = requests;
    expect(parseUrl(request.url).pathname).toBe('/web/login/device/code');
    expect(request.headers['accept']).toBe('application/json');
    expect(JSON.parse(request.body)).toMatchObject({ client_id: 'client' });
  });

  test('reads the body of a 4xx instead of losing it to a rejection', async () => {
    handler = () => ({
      status: 400,
      body: { error: 'unsupported', error_description: 'Device flow is off' },
    });

    await expect(requestDeviceCode('client')).rejects.toMatchObject({
      message: 'Device flow is off',
    });
  });

  test('returns the token once GitHub hands it over', async () => {
    let polls = 0;
    handler = () => {
      polls += 1;
      return polls === 1
        ? { status: 200, body: { error: 'authorization_pending' } }
        : { status: 200, body: { access_token: 'gho_token' } };
    };

    const token = await pollForAccessToken('client', {
      deviceCode: 'dc',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 0,
    });

    expect(token).toBe('gho_token');
    expect(parseUrl(requests[0].url).pathname).toBe(
      '/web/login/oauth/access_token'
    );
    expect(JSON.parse(requests[0].body)).toStrictEqual({
      client_id: 'client',
      device_code: 'dc',
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
  });

  test('aborts an in-flight poll when the caller cancels', async () => {
    const controller = new AbortController();
    handler = () => {
      controller.abort();
      return undefined;
    };

    const error = await pollForAccessToken(
      'client',
      {
        deviceCode: 'dc',
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 0,
      },
      { signal: controller.signal }
    ).catch((e) => e);

    expect(error).toBeInstanceOf(StatsError);
    expect(error.message).toBe('サインインをキャンセルしました。');
  });
});
