import {
  DeviceCode,
  pollForAccessToken,
  requestDeviceCode,
  validateToken,
} from '@/api';
import { GITHUB_OAUTH_CLIENT_ID } from '@/config';
import { clearToken, getToken, setToken } from '@/storage';
import { StatsError } from '@/types/stats';
import {
  Box,
  Button,
  ChakraProvider,
  Code,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Status =
  | { kind: 'idle' }
  | { kind: 'verifying' }
  | { kind: 'awaiting'; code: DeviceCode }
  | { kind: 'saved'; login: string }
  | { kind: 'cleared' }
  | { kind: 'error'; message: string };

const openVerificationPage = (url: string): void => {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url });
    return;
  }
  window.open(url, '_blank', 'noopener');
};

const describe = (caught: unknown, fallback: string): string =>
  caught instanceof StatsError ? caught.message : fallback;

export const Options = () => {
  const [token, setTokenValue] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const abort = useRef<AbortController>();
  const helperColor = useColorModeValue('gray.600', 'gray.400');
  // Read at render time so a build without a configured OAuth app simply falls
  // back to the manual token field.
  const signInAvailable = GITHUB_OAUTH_CLIENT_ID !== '';

  useEffect(() => {
    getToken().then(setTokenValue);
    return () => abort.current?.abort();
  }, []);

  /** Stores a token that is already known to be valid. */
  const persist = async (accessToken: string, login: string) => {
    await setToken(accessToken);
    setTokenValue(accessToken);
    setStatus({ kind: 'saved', login });
  };

  const onSignIn = async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setStatus({ kind: 'verifying' });

    try {
      const code = await requestDeviceCode(GITHUB_OAUTH_CLIENT_ID);
      setStatus({ kind: 'awaiting', code });
      openVerificationPage(code.verificationUri);

      const accessToken = await pollForAccessToken(
        GITHUB_OAUTH_CLIENT_ID,
        code,
        { signal: controller.signal }
      );
      const login = await validateToken(accessToken);
      await persist(accessToken, login);
    } catch (caught) {
      setStatus({
        kind: 'error',
        message: describe(caught, 'Sign-in failed.'),
      });
    }
  };

  const onCancelSignIn = () => {
    abort.current?.abort();
    setStatus({ kind: 'idle' });
  };

  const onSave = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setStatus({ kind: 'error', message: 'Enter a token first.' });
      return;
    }
    setStatus({ kind: 'verifying' });
    try {
      const login = await validateToken(trimmed);
      await persist(trimmed, login);
    } catch (caught) {
      setStatus({
        kind: 'error',
        message: describe(caught, 'Could not verify the token.'),
      });
    }
  };

  const onClear = async () => {
    abort.current?.abort();
    await clearToken();
    setTokenValue('');
    setStatus({ kind: 'cleared' });
  };

  return (
    <Box p={6} maxW="640px">
      <Heading as="h1" size="md" mb={2}>
        GitHub Language Stats
      </Heading>
      <Text fontSize="sm" color={helperColor} mb={5}>
        Without credentials the extension uses the anonymous GitHub REST API,
        which is limited to 60 requests per hour and cannot report commits, PRs,
        issues or rank. Connecting an account raises the limit to 5,000 requests
        per hour and restores the full card.
      </Text>

      {signInAvailable && (
        <>
          <Button
            bg="#4299E1"
            color="white"
            onClick={onSignIn}
            isLoading={status.kind === 'verifying'}
            isDisabled={status.kind === 'awaiting'}
          >
            Sign in with GitHub
          </Button>
          <Text fontSize="xs" color={helperColor} mt={2}>
            No scopes are requested, so GitHub only confirms who you are.
            Nothing in your account can be read beyond what is already public.
          </Text>

          {status.kind === 'awaiting' && (
            <Box
              mt={4}
              p={4}
              borderWidth="1px"
              borderRadius="md"
              data-testid="device-code"
            >
              <Text fontSize="sm" mb={2}>
                Enter this code on GitHub to finish signing in:
              </Text>
              <Code fontSize="xl" px={3} py={1} letterSpacing="widest">
                {status.code.userCode}
              </Code>
              <Text fontSize="sm" mt={3}>
                <Link
                  color="#4299E1"
                  onClick={() =>
                    openVerificationPage(status.code.verificationUri)
                  }
                >
                  Reopen {status.code.verificationUri}
                </Link>
              </Text>
              <HStack mt={3}>
                <Button size="sm" variant="outline" onClick={onCancelSignIn}>
                  Cancel
                </Button>
                <Text fontSize="sm" color={helperColor}>
                  Waiting for approval...
                </Text>
              </HStack>
            </Box>
          )}

          <Divider my={6} />
        </>
      )}

      <FormControl>
        <FormLabel fontSize="sm">
          {signInAvailable
            ? 'Or paste a personal access token'
            : 'GitHub personal access token'}
        </FormLabel>
        <Input
          type="password"
          value={token}
          placeholder="ghp_..."
          onChange={(event) => setTokenValue(event.target.value)}
        />
        <FormHelperText color={helperColor}>
          A classic token needs no scopes for public data; add <code>repo</code>{' '}
          to include your private contributions. The token is stored locally in
          this browser profile and is only ever sent to api.github.com.
        </FormHelperText>
      </FormControl>

      <HStack mt={4}>
        <Button
          variant={signInAvailable ? 'outline' : 'solid'}
          bg={signInAvailable ? undefined : '#4299E1'}
          color={signInAvailable ? undefined : 'white'}
          onClick={onSave}
          isLoading={status.kind === 'verifying'}
        >
          Save
        </Button>
        <Button variant="outline" onClick={onClear}>
          Clear
        </Button>
      </HStack>

      {status.kind === 'saved' && (
        <Text mt={3} fontSize="sm" color="green.500">
          Connected as {status.login}.
        </Text>
      )}
      {status.kind === 'cleared' && (
        <Text mt={3} fontSize="sm" color={helperColor}>
          Disconnected. The extension will fall back to anonymous requests.
        </Text>
      )}
      {status.kind === 'error' && (
        <Text mt={3} fontSize="sm" color="red.500">
          {status.message}
        </Text>
      )}
    </Box>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ChakraProvider>
        <Options />
      </ChakraProvider>
    </React.StrictMode>
  );
}
