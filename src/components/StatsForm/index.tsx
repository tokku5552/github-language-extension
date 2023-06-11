import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
} from '@chakra-ui/react';
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
  return (
    <>
      <Box pb={2} pl={4} pr={4}>
        <form onSubmit={onSubmit}>
          <FormControl id="username" isInvalid={!!errors.username} isRequired>
            <FormLabel>GitHub username</FormLabel>
            <Input
              placeholder="GitHub username"
              {...register('username', { required: true })}
            />
            <FormErrorMessage>
              {errors.username && 'GitHub username is required'}
            </FormErrorMessage>
          </FormControl>
          <Button
            mt={2}
            bg="#4299E1"
            color="white"
            isLoading={formState.isSubmitting}
            type="submit"
          >
            Submit
          </Button>
        </form>
      </Box>
    </>
  );
}
