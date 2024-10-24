import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import React from 'react';
import StatsBody from '.';

describe('StatsBody', () => {
  test('rendering', () => {
    const { container } = render(
      <ChakraProvider>
        <StatsBody
          currentStats="<p>test</p>"
          currentTopLanguage="<p>test</p>"
        />
      </ChakraProvider>
    );

    expect(container.innerHTML).toMatch('<p>test</p><p>test</p>');
  });
});
