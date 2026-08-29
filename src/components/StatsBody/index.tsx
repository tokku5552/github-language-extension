import parse from 'html-react-parser';
import React from 'react';

export interface StatsBodyProps {
  currentStats: string;
  currentTopLanguage: string;
  isLoading: boolean;
}

const spinnerKeyframes = `@keyframes gls-spinner-rotate { to { transform: rotate(360deg); } }`;

const Spinner = () => (
  <>
    <style>{spinnerKeyframes}</style>
    <div
      data-testid="spinner"
      role="status"
      aria-label="Loading"
      style={{
        width: '48px',
        height: '48px',
        border: '4px solid rgba(128, 128, 128, 0.25)',
        borderTopColor: '#4299E1',
        borderRadius: '50%',
        animation: 'gls-spinner-rotate 0.65s linear infinite',
      }}
    />
  </>
);

export default function StatsBody({
  currentStats,
  currentTopLanguage,
  isLoading,
}: StatsBodyProps) {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '16px',
          height: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!currentStats) {
    return null;
  }

  return (
    <div style={{ padding: '16px' }}>
      {parse(currentStats)}
      {parse(currentTopLanguage)}
    </div>
  );
}
