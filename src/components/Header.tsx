import { Red_Hat_Mono } from "next/font/google";

const rhm = Red_Hat_Mono({ subsets: ['latin'] })

export default function Header() {
    return (
        <div>
            <div className={`flex flex-row`}>
                <h1 className={`${rhm.className} font-thin font text-6xl`}>Commit</h1> <h1 className={`${rhm.className} font-extrabold text-6xl`}>CV</h1>
            </div>
        </div>
    )
}