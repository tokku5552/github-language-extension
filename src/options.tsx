import {
  DeviceCode,
  pollForAccessToken,
  requestDeviceCode,
  validateToken,
} from '@/api';
import { GITHUB_OAUTH_CLIENT_ID } from '@/config';
import { clearToken, getToken, setToken } from '@/storage';
import { StatsErrorType } from '@/types/enums';
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

/**
 * Translates a failure for this page.
 *
 * Mapped by type rather than by reusing `error.message`, because the messages
 * on errors from src/api/github.ts are shared with the popup, which is in
 * English. Device flow errors are options-page-only and already carry Japanese
 * text, so those pass through.
 */
const messageFor = (caught: unknown, fallback: string): string => {
  if (!(caught instanceof StatsError)) {
    return fallback;
  }
  switch (caught.type) {
    case StatsErrorType.UNAUTHORIZED:
      return 'GitHub にトークンを拒否されました。値が正しいか確認してください。';
    case StatsErrorType.RATE_LIMITED:
      return 'GitHub API のレート制限に達しました。しばらく待ってから再試行してください。';
    case StatsErrorType.NOT_FOUND:
      return 'GitHub がこのリクエストを受け付けませんでした。';
    default:
      return caught.message || fallback;
  }
};

export const Options = () => {
  const [token, setTokenValue] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController>();
  const helperColor = useColorModeValue('gray.600', 'gray.400');
  // A build without a configured OAuth app (the constant left at '') falls
  // back to the manual token field, since this is false. Read here rather
  // than hoisted to module scope so options.spec.tsx can flip it per test via
  // a mocked getter.
  const signInAvailable = GITHUB_OAUTH_CLIENT_ID !== '';

  useEffect(() => {
    getToken().then(setTokenValue);
    return () => abort.current?.abort();
  }, []);

  /** Stores a token that is already known to be valid. */
  const persist = async (
    accessToken: string,
    login: string,
    isCurrent: () => boolean
  ) => {
    await setToken(accessToken);
    if (!isCurrent()) {
      return;
    }
    setTokenValue(accessToken);
    setStatus({ kind: 'saved', login });
  };

  /**
   * Claims the page for a new attempt and returns a predicate saying whether
   * that attempt is still the current one. Every awaited step in onSignIn and
   * onSave can still settle after the user cancels, clears, or starts over -
   * the poll notices an abort only on its next tick, and requestDeviceCode,
   * validateToken and setToken do not take a signal at all - so every write
   * after an await is guarded by this rather than relying on any one of them.
   */
  const beginAttempt = () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    return { controller, isCurrent: () => abort.current === controller };
  };

  /** Ends the current attempt without starting another. */
  const endAttempt = () => {
    abort.current?.abort();
    abort.current = undefined;
  };

  const onSignIn = async () => {
    const { controller, isCurrent } = beginAttempt();
    setCopied(false);
    setStatus({ kind: 'verifying' });

    try {
      const code = await requestDeviceCode(GITHUB_OAUTH_CLIENT_ID);
      if (!isCurrent()) {
        return;
      }
      // The verification page is deliberately NOT opened here. It asks for a
      // code that is only shown on this page, so sending the user there before
      // they have seen it leaves them staring at an empty field.
      setStatus({ kind: 'awaiting', code });

      const accessToken = await pollForAccessToken(
        GITHUB_OAUTH_CLIENT_ID,
        code,
        { signal: controller.signal }
      );
      if (!isCurrent()) {
        return;
      }
      const login = await validateToken(accessToken);
      if (!isCurrent()) {
        return;
      }
      await persist(accessToken, login, isCurrent);
    } catch (caught) {
      if (!isCurrent()) {
        return;
      }
      setStatus({
        kind: 'error',
        message: messageFor(caught, 'サインインに失敗しました。'),
      });
    }
  };

  /**
   * Puts the code on the clipboard before opening GitHub, so the field waiting
   * on the other side can just be pasted into. Opening still happens if the
   * clipboard is unavailable; the code stays on screen either way.
   */
  const onCopyAndOpen = async (code: DeviceCode) => {
    try {
      await navigator.clipboard.writeText(code.userCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    openVerificationPage(code.verificationUri);
  };

  const onCancelSignIn = () => {
    endAttempt();
    setCopied(false);
    setStatus({ kind: 'idle' });
  };

  const onSave = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      // Pressing Save with the field empty also ends a pending sign-in - not
      // just an empty save. Typing in the field alone does nothing.
      endAttempt();
      setStatus({ kind: 'error', message: 'トークンを入力してください。' });
      return;
    }
    const { isCurrent } = beginAttempt();
    setStatus({ kind: 'verifying' });
    try {
      const login = await validateToken(trimmed);
      if (!isCurrent()) {
        return;
      }
      await persist(trimmed, login, isCurrent);
    } catch (caught) {
      if (!isCurrent()) {
        return;
      }
      setStatus({
        kind: 'error',
        message: messageFor(caught, 'トークンを検証できませんでした。'),
      });
    }
  };

  const onClear = async () => {
    endAttempt();
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
        アカウントを接続していない間は、匿名の GitHub REST API
        を使います。1時間あたり60リクエストまでに制限され、コミット数・PR数・Issue数・ランクは取得できません。接続すると1時間あたり5,000リクエストになり、これらがすべて表示されます。
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
            GitHub でサインイン
          </Button>
          <Text fontSize="xs" color={helperColor} mt={2}>
            権限（スコープ）は一切要求しません。GitHub
            が確認するのはあなたが誰かということだけで、公開されている以上の情報は読み取られません。
          </Text>

          {status.kind === 'awaiting' && (
            <Box
              mt={4}
              p={4}
              borderWidth="1px"
              borderRadius="md"
              data-testid="device-code"
            >
              <Text fontSize="sm" fontWeight="bold" mb={1}>
                ステップ1: このコードをコピーします
              </Text>
              <Code
                fontSize="2xl"
                px={3}
                py={2}
                letterSpacing="widest"
                display="block"
                textAlign="center"
                my={2}
              >
                {status.code.userCode}
              </Code>

              <Text fontSize="sm" fontWeight="bold" mt={4} mb={2}>
                ステップ2: GitHub で貼り付けて承認します
              </Text>
              <Button
                size="sm"
                bg="#4299E1"
                color="white"
                onClick={() => onCopyAndOpen(status.code)}
              >
                コードをコピーして GitHub を開く
              </Button>
              {copied && (
                <Text fontSize="xs" color="green.500" mt={2}>
                  コピーしました。開いたタブで貼り付けてください。
                </Text>
              )}
              <Text fontSize="xs" color={helperColor} mt={2}>
                開かない場合は{' '}
                <Link
                  color="#4299E1"
                  onClick={() =>
                    openVerificationPage(status.code.verificationUri)
                  }
                >
                  {status.code.verificationUri}
                </Link>{' '}
                を開いて、上のコードを手で入力してください。
              </Text>

              <HStack mt={4}>
                <Button size="sm" variant="outline" onClick={onCancelSignIn}>
                  キャンセル
                </Button>
                <Text fontSize="sm" color={helperColor}>
                  承認を待っています...
                  承認するとこの画面が自動で切り替わります。
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
            ? 'または、パーソナルアクセストークンを貼り付ける'
            : 'GitHub パーソナルアクセストークン'}
        </FormLabel>
        <Input
          type="password"
          value={token}
          placeholder="ghp_..."
          onChange={(event) => setTokenValue(event.target.value)}
        />
        <FormHelperText color={helperColor}>
          公開データだけならスコープなしの classic
          トークンで足ります。自分のプライベートリポジトリの統計も含めたい場合は{' '}
          <code>repo</code>{' '}
          を付けてください。トークンはこのブラウザのプロフィール内にのみ保存され、送信先は
          api.github.com だけです。
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
          保存
        </Button>
        <Button variant="outline" onClick={onClear}>
          削除
        </Button>
      </HStack>

      {status.kind === 'saved' && (
        <Text mt={3} fontSize="sm" color="green.500">
          {status.login} として接続しました。
        </Text>
      )}
      {status.kind === 'cleared' && (
        <Text mt={3} fontSize="sm" color={helperColor}>
          接続を解除しました。以降は匿名のリクエストに戻ります。
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
