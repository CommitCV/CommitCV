import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {ResumeData} from "@/app/resume/page";

interface IDoubleTextFormProps {
  bold?: string;
  normal?: string;
  setJData: React.Dispatch<React.SetStateAction<ResumeData| null>>;
  onBoldChange: (newBold: string) => void;
  onNormalChange: (newNormal: string) => void;
}

export default function DoubleTextForm({ bold, normal, setJData }: IDoubleTextFormProps) {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      bold: bold || '',
      normal: normal || '',
    },
  });

  const onSubmit = (data: { bold?: string; normal?: string }) => {
    setJData((prev) => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });
  };

  return (
    <form onBlur={handleSubmit(onSubmit)}>
      <Controller
        name="bold"
        control={control}
        render={({ field }) => (
          <input
            {...field}
            placeholder="Bold text"
          />
        )}
      />
      <Controller
        name="normal"
        control={control}
        render={({ field }) => (
          <input
            {...field}
            placeholder="Normal text"
          />
        )}
      />
    </form>
  );
}