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
        <form onBlur={handleSubmit(onSubmit)}>
            <Controller
                name="bold"
                control={control}
                render={({ field }) => (
                    <input {...field} placeholder="Bold text" />
                )}
            />
            <Controller
                name="normal"
                control={control}
                render={({ field }) => (
                    <input {...field} placeholder="Normal text" />
                )}
            />
        </form>
    );
}