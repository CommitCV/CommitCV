import React from 'react';
import { useForm, Controller } from 'react-hook-form';

export interface ITextComponent {
    bold?: string;
    normal?: string;
    isBullet?: boolean;
    onBoldChange: (bold: string) => void;
    onNormalChange: (normal: string) => void;
}

export default function TextComponent({ bold, normal, isBullet, onBoldChange, onNormalChange }: ITextComponent) {
    const { control, handleSubmit } = useForm({
        defaultValues: {
            bold: bold,
            normal: normal

        }
    });

    const onSubmit = (data: { bold?: string; normal?: string }) => {
        onBoldChange(data.bold || '');
        onNormalChange(data.normal || '');
    };

    return (
        <form onBlur={handleSubmit(onSubmit)} className={`flex flex-row p-1 gap-2`}>
            <Controller
                name="bold"
                control={control}
                render={({ field }) => (
                    <input
                        {...field}
                        placeholder="Bold Text  "
                        className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                    />
                )}
            />
            <Controller
                name="normal"
                control={control}
                render={({ field }) => (
                    <input
                        {...field}
                        placeholder="Normal Text"
                        className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                    />
                )}
            />
        </form>
    );
}
