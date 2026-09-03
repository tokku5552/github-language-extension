import { validateToken } from '@/api';
import { clearToken, getToken, setToken } from '@/storage';
import { StatsError } from '@/types/stats';
import {
  Box,
  Button,
  ChakraProvider,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; login: string }
  | { kind: 'cleared' }
  | { kind: 'error'; message: string };

export const Options = () => {
  const [token, setTokenValue] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const helperColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    getToken().then(setTokenValue);
  }, []);

  const onSave = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setStatus({ kind: 'error', message: 'Enter a token first.' });
      return;
    }
    setStatus({ kind: 'saving' });
    try {
      const login = await validateToken(trimmed);
      await setToken(trimmed);
      setStatus({ kind: 'saved', login });
    } catch (caught) {
      setStatus({
        kind: 'error',
        message:
          caught instanceof StatsError
            ? caught.message
            : 'Could not verify the token.',
      });
    }
  };

  const onClear = async () => {
    await clearToken();
    setTokenValue('');
    setStatus({ kind: 'cleared' });
  };

  return (
    <Box p={6} maxW="640px">
      <Heading as="h1" size="md" mb={4}>
        GitHub Language Stats
      </Heading>

      <FormControl>
        <FormLabel>GitHub personal access token</FormLabel>
        <Input
          type="password"
          value={token}
          placeholder="ghp_..."
          onChange={(event) => setTokenValue(event.target.value)}
        />
        <FormHelperText color={helperColor}>
          Optional. Without a token the extension uses the anonymous REST API,
          which is limited to 60 requests per hour and cannot report commits,
          PRs, issues, rank or private contributions. A classic token needs no
          scopes for public data; add <code>repo</code> to include private
          contributions. The token is stored locally in this browser profile and
          is only ever sent to api.github.com.
        </FormHelperText>
      </FormControl>

      <HStack mt={4}>
        <Button
          bg="#4299E1"
          color="white"
          onClick={onSave}
          isLoading={status.kind === 'saving'}
        >
          Save
        </Button>
        <Button variant="outline" onClick={onClear}>
          Clear
        </Button>
      </HStack>

      {status.kind === 'saved' && (
        <Text mt={3} fontSize="sm" color="green.500">
          Saved. Authenticated as {status.login}.
        </Text>
      )}
      {status.kind === 'cleared' && (
        <Text mt={3} fontSize="sm" color={helperColor}>
          Token removed. The extension will fall back to anonymous requests.
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
