/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
import StatsForm, { StatsFormProps } from './index';

jest.mock('react-hook-form');

describe('StatsForm', () => {
  const onSubmitMock = jest.fn();
  const registerMock = jest.fn();
  const formStateMock = { errors: {} } as any;
  const useFormMock: UseFormReturn<any> = {
    handleSubmit: (callback: any) => (e: any) => {
      e?.preventDefault();
      callback({});
    },
    register: registerMock,
    formState: formStateMock,
    watch: jest.fn(),
    getValues: jest.fn(),
    getFieldState: jest.fn(),
    setError: jest.fn(),
  } as any;

  beforeEach(() => {
    (useForm as jest.MockedFunction<typeof useForm>).mockReturnValue(
      useFormMock
    );
  });

  const renderStatsForm = (props?: Partial<StatsFormProps>) => {
    const defaultProps: StatsFormProps = {
      onSubmit: onSubmitMock,
      register: registerMock,
      formState: formStateMock,
    };
    render(
      <ChakraProvider>
        <StatsForm {...defaultProps} {...props} />
      </ChakraProvider>
    );
  };

  test('renders StatsForm component', () => {
    renderStatsForm();

    const usernameLabel = screen.getByText('GitHub username');
    expect(usernameLabel).toBeInTheDocument();

    const submitButton = screen.getByText('Submit');
    expect(submitButton).toBeInTheDocument();
  });

  // test('calls onSubmit when form is submitted', async () => {
  //   renderStatsForm();

  //   const submitButton = screen.getByText('Submit');
  //   fireEvent.click(submitButton);

  //   await waitFor(() => {
  //     expect(onSubmitMock).toHaveBeenCalled();
  //   });
  // });
});
