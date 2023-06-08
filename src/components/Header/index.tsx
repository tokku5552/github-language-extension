import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { Box, Button, Flex, Heading, useColorMode } from '@chakra-ui/react';
import React from 'react';

export default function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <>
      <Box
        bg="#4299E1"
        w="100%"
        h={20}
        p={4}
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Flex
          h={16}
          alignItems={'center'}
          justifyContent={'space-between'}
          w="100%"
        >
          <Box>
            <Heading as="h3" size="xl" isTruncated>
              GitHub Language Stats
            </Heading>
          </Box>
          <Box>
            <Button onClick={toggleColorMode}>
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
          </Box>
        </Flex>
      </Box>
    </>
  );
}
