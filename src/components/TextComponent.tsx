export interface ITextComponent {
    bold?: string
    normal?: string
    isBullet?: boolean
}

export default function TextComponent({ bold, normal, isBullet }: ITextComponent) {
    return(
        <div className={`flex flex-row p-1 gap-2`}>
            <input
                id="name"
                name="name"
                type="text"
                value={bold}
                placeholder={isBullet ? "Bullet Bold Text" : "Bold Text"}
                className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
            />

            <input
                id="name"
                name="name"
                type="text"
                value={normal}
                placeholder={isBullet ? "Bullet Normal Text" : "Normal Text"}
                className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
            />
        </div>
    )
}