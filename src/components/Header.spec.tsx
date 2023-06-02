import { render } from '@testing-library/react';
import React from 'react';
import Header from './Header';

describe('Header', () => {
  test('rendering', () => {
    const { container } = render(<Header />);

    expect(container.innerHTML).toMatch('GitHub Language Stats');
  });
});
