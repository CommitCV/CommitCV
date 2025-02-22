"use client"
//import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import SectionCard from "@/components/SectionCard";

// import Link from "next/link";
import {useState} from "react";
import PDF from "@/components/PDF";

export default function Home() {
    //const router = useRouter();

    // const handleLogin = () => {
    //     router.push("/api/github/login");
    // };
    //
    // const handleLogout = () => {
    //     router.push("/api/github/logout");
    // };
    //
    // const handleInstall = () => {
    //     window.location.href = `https://github.com/apps/commitcv/installations/new`;
    // }


    return (
        <div>
            <Header/>
            <div className={`grid grid-cols-2`}>
                <div><SectionCard/></div>
                <div>
                    <PDF/>
                </div>
            </div>
            {/*<h1>Welcome</h1>*/}
            {/*<button onClick={handleLogin}>Sign in with GitHub</button>*/}
            {/*<button onClick={handleLogout}>Logout</button>*/}
            {/*<button onClick={handleInstall}>Install GitHub App</button>*/}
            {/*<Link href="/resume">Go to Protected Page</Link>*/}
        </div>
    );
}
