import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import React from 'react';
import { Header } from '..';

describe('Header', () => {
  test('rendering', () => {
    const { container } = render(
      <ChakraProvider>
        <Header />
      </ChakraProvider>
    );

    expect(container.innerHTML).toMatch('GitHub Language Stats');
  });
});
