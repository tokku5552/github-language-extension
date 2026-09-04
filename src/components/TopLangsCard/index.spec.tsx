import '@testing-library/jest-dom';
import { LanguageUnit } from '@/types/enums';
import { LanguageStat } from '@/types/stats';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import TopLangsCard from '.';

const languages: LanguageStat[] = [
  { name: 'TypeScript', value: 750, color: '#3178c6' },
  { name: 'Go', value: 250, color: '#00ADD8' },
];

const renderCard = (
  stats: LanguageStat[],
  unit: LanguageUnit = LanguageUnit.BYTES
) =>
  render(
    <ChakraProvider>
      <TopLangsCard languages={stats} languageUnit={unit} />
    </ChakraProvider>
  );

describe('TopLangsCard', () => {
  test('renders each language with its share', () => {
    renderCard(languages);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  test('sizes the bar segments by share', () => {
    renderCard(languages);

    expect(screen.getByTestId('lang-bar-TypeScript')).toHaveStyle('width: 75%');
  });

  test('explains the unit when counting repositories', () => {
    renderCard(languages, LanguageUnit.REPOS);

    expect(
      screen.getByText(/Share of repositories by primary language/i)
    ).toBeInTheDocument();
  });

  test('does not explain the unit when counting bytes', () => {
    renderCard(languages);

    expect(
      screen.queryByText(/Share of repositories by primary language/i)
    ).not.toBeInTheDocument();
  });

  test('handles a user with no language data', () => {
    renderCard([]);

    expect(screen.getByText(/No language data available/i)).toBeInTheDocument();
  });
});
