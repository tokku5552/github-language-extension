import React from 'react';
import { FormState, UseFormRegister } from 'react-hook-form';

export interface StatsFormProps {
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  register: UseFormRegister<FormData>;
  formState: FormState<FormData>;
}

export default function StatsForm({
  onSubmit,
  register,
  formState,
}: StatsFormProps) {
  const { errors } = formState;
  const isInvalid = !!errors.username;
  const isLoading = formState.isSubmitting;

  return (
    <div
      style={{
        paddingBottom: '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <form onSubmit={onSubmit}>
        <div>
          <label
            htmlFor="username"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            GitHub username
            <span
              style={{ color: '#E53E3E', marginLeft: '4px' }}
              aria-hidden="true"
            >
              *
            </span>
          </label>
          <input
            id="username"
            placeholder="GitHub username"
            aria-required="true"
            aria-invalid={isInvalid}
            style={{
              width: '100%',
              height: '40px',
              padding: '0 16px',
              border: `1px solid ${isInvalid ? '#E53E3E' : '#E2E8F0'}`,
              borderRadius: '6px',
              outline: 'none',
              boxSizing: 'border-box',
              fontSize: '16px',
            }}
            {...register('username', { required: true })}
          />
          {isInvalid && (
            <div
              style={{
                color: '#E53E3E',
                marginTop: '8px',
                fontSize: '14px',
              }}
            >
              GitHub username is required
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            marginTop: '8px',
            height: '40px',
            padding: '0 16px',
            backgroundColor: '#4299E1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? 'Loading...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
