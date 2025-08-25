import '@testing-library/jest-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import React from 'react';
import StatsBody from '.';

describe('StatsBody', () => {
  test('renders stats when not loading and stats are present', () => {
    const { container } = render(
      <ChakraProvider>
        <StatsBody
          currentStats="<p>stats</p>"
          currentTopLanguage="<p>langs</p>"
          isLoading={false}
        />
      </ChakraProvider>
    );

    expect(container.innerHTML).toMatch('<p>stats</p>');
    expect(container.innerHTML).toMatch('<p>langs</p>');
    expect(container.querySelector('.chakra-spinner')).not.toBeInTheDocument();
  });

  test('renders spinner when loading', () => {
    const { container } = render(
      <ChakraProvider>
        <StatsBody currentStats="" currentTopLanguage="" isLoading={true} />
      </ChakraProvider>
    );

    expect(container.querySelector('.chakra-spinner')).toBeInTheDocument();
  });

  test('renders nothing when not loading and stats are empty', () => {
    const { container } = render(
      <ChakraProvider>
        <StatsBody currentStats="" currentTopLanguage="" isLoading={false} />
      </ChakraProvider>
    );

    // The component renders a fragment, and Chakra adds a hidden span
    // So we check that no 'div' (from the Box component) is rendered.
    expect(container.querySelector('div')).toBeNull();
  });
});
