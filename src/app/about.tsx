import { NavLink } from "react-router";
import Header from "@components/header";
import Footer from "@components/footer";

export default function About() {
    return (
        <>
            <Header />
            <div className="min-h-screen flex flex-col items-center justify-center bg-bg-1 text-fg-1 gap-8">
                <h1 className="text-4xl font-bold tracking-tight">
                    The Example About Page
                </h1>

                <p className="text-sm text-fg-3">
                    Here there will be information regarding CommitCV
                </p>

                <nav>
                    <NavLink
                        to="/"
                        end>
                        Home
                    </NavLink>
                </nav>
            </div>
            <Footer />
        </>
    );
}
