import React from 'react';
import { useForm, Controller } from 'react-hook-form';

export interface IHeaderComponent {
    text: string;
    link?: string;
    onTextChange: (text: string) => void;
    onLinkChange: (link: string) => void;
}

export default function HeaderObject({ text, link, onTextChange, onLinkChange }: IHeaderComponent) {
    const { control, handleSubmit } = useForm({
        defaultValues: {
            text: text,
            link: link
        }
    });

    const onSubmit = (data: { text: string; link?: string }) => {
        onTextChange(data.text);
        onLinkChange(data.link || '');
    };

    return (
        <form onBlur={handleSubmit(onSubmit)} className={`flex flex-row p-1 gap-2`}>
            <Controller
                name="text"
                control={control}
                render={({ field }) => (
                    <input
                        {...field}
                        placeholder="Text"
                        className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                    />
                )}
            />
            <Controller
                name="link"
                control={control}
                render={({ field }) => (
                    <input
                        {...field}
                        placeholder="Link"
                        className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                    />
                )}
            />
        </form>
    );
}
