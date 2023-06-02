import Header from '@/components/Header';
import { render } from '@testing-library/react';
import React from 'react';

describe('Header', () => {
  test('rendering', () => {
    const { container } = render(<Header />);

    expect(container.innerHTML).toMatch('GitHub Language Stats');
  });
});
