import React from "react";
import { UseFormRegisterReturn } from "react-hook-form";
type PropsType = {
  id: string;
  labelName: string;
  register: UseFormRegisterReturn;
};

export const TextInput = (props: PropsType) => {
  const { id, labelName, register } = props;

  return (
    <>
      <label htmlFor={id}>{labelName}</label>
      <input id={id} type="text" {...register} />
    </>
  );
};

export default TextInput;
