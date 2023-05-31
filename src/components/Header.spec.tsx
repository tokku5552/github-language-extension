import { render } from '@testing-library/react';
import React from 'react';
import Header from './Header';

describe('Header', () => {
  test('', () => {
    const { container } = render(<Header>Test Title</Header>);

    // logDOM(screen.getByText('Test Title'));
    expect(container.innerHTML).toMatch('Test Title');
  });
});
