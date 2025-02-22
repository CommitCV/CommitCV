export interface IHeaderComponent {
    text: string
    link?: string
}

export default function HeaderObject({ text, link }: IHeaderComponent) {
    return(
        <div className={`flex flex-row p-1 gap-2`}>
            <input
                id="name"
                name="name"
                type="text"
                value={text}
                placeholder={"Text"}
                className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
            />

            <input
                id="name"
                name="name"
                type="text"
                value={link}
                placeholder={"Link"}
                className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
            />
        </div>
    )
}