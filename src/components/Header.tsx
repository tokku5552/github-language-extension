import { Box, Heading } from '@chakra-ui/react';
import React, { ReactNode } from 'react';

export default function Header({ children }: { children: ReactNode }) {
  return (
    <>
      <Box bg="#4299E1" w="100%" p={4} color="white">
        <Heading as="h3" size="xl" isTruncated>
          {children}
        </Heading>
      </Box>
    </>
  );
}