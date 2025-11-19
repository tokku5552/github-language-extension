import type { BaseSyntheticEvent } from 'react';

declare module 'react-hook-form' {
  export type FieldValues = Record<string, unknown>;

  export type UseFormRegister<TFieldValues = FieldValues> = (
    name: keyof TFieldValues | `${string}`,
    options?: { required?: boolean }
  ) => Record<string, unknown>;

  export interface FormState<TFieldValues = FieldValues> {
    errors: Record<string, any>;
    isSubmitting?: boolean;
  }

  export interface UseFormReturn<TFieldValues = FieldValues> {
    register: UseFormRegister<TFieldValues>;
    handleSubmit: (
      callback: (data: TFieldValues) => void
    ) => (event?: BaseSyntheticEvent) => void;
    formState: FormState<TFieldValues>;
    watch: (...args: unknown[]) => unknown;
    getValues: (...args: unknown[]) => unknown;
    getFieldState: (...args: unknown[]) => unknown;
    setError: (...args: unknown[]) => unknown;
    setValue: (name: keyof TFieldValues | `${string}`, value: unknown) => void;
  }

  export function useForm<TFieldValues = FieldValues>(): UseFormReturn<TFieldValues>;
}
