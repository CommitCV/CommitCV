import { Red_Hat_Mono } from "next/font/google";
import Link from "next/link";
import { IoLogoGithub } from "react-icons/io";

const rhm = Red_Hat_Mono({ subsets: ['latin'] })

export default function Header() {
    return (
        <div>
            <div className={`flex flex-row p-2`}>
                <Link href={`/`}>
                    <h1 className={`${rhm.className} font-thin font text-6xl`}>Commit</h1> <h1 className={`${rhm.className} font-extrabold text-6xl`}>CV</h1>
                </Link>
                <div className={`ml-auto flex flex-row items-center`}>
                    <h2 className={`mr-2 ${rhm.className}`}>Check out our code on</h2>
                    <Link href={"https://github.com/CommitCV/CommitCV"}>
                        <IoLogoGithub size={42}/>
                    </Link>
                </div>
            </div>
        </div>
    )
}
