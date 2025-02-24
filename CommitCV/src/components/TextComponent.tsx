import React from 'react';
import { useForm, Controller } from 'react-hook-form';

interface ITextComponentProps {
    bold?: string;
    normal?: string;
    onBoldChange: (newBold: string) => void;
    onNormalChange: (newNormal: string) => void;
}

export default function TextComponent({
                                          bold,
                                          normal,
                                          onBoldChange,
                                          onNormalChange
                                      }: ITextComponentProps) {
    const { control, handleSubmit } = useForm({
        defaultValues: { bold: bold ?? '', normal: normal ?? '' }
    });

    const onSubmit = (data: { bold?: string; normal?: string }) => {
        onBoldChange(data.bold ?? '');
        onNormalChange(data.normal ?? '');
    };


  return (
    <form onBlur={handleSubmit(onSubmit)} className="space-y-1"> {/* Reduced vertical spacing */}
      <Controller
        name="bold"
        control={control}
        render={({ field }) => (
          <input
            {...field}
            placeholder="Bold text"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring focus:ring-blue-100" // Smaller size and subtle focus
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
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring focus:ring-blue-100" // Smaller size and subtle focus
          />
        )}
      />
    </form>
  );
}
