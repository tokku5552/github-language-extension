import { MoonIcon, SunIcon } from '@/components/icons';
import { useColorMode } from '@/theme';
import React from 'react';

export default function Header() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <div
      style={{
        backgroundColor: '#4299E1',
        width: '100%',
        height: '80px',
        padding: '16px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            GitHub Language Stats
          </h1>
        </div>
        <div>
          <button
            type="button"
            onClick={toggleColorMode}
            aria-label="Toggle color mode"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '40px',
              height: '40px',
              padding: '0 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            {colorMode === 'light' ? (
              <MoonIcon size="1.2em" />
            ) : (
              <SunIcon size="1.2em" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
