import { NavLink } from "react-router";
import Header from "@components/header";
import Footer from "@components/footer";

export default function About() {
    return (
        <div className="min-h-screen flex flex-col bg-light-100 dark:bg-dark-300 text-light-950 dark:text-dark-950">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
                <h1 className="text-4xl font-bold tracking-tight">
                    The Example About Page
                </h1>

                <p className="text-lg text-light-700 dark:text-dark-700">
                    Here there will be information regarding CommitCV
                </p>

                <nav>
                    <NavLink
                        to="/"
                        end
                        className="text-accent font-medium hover:underline">
                        Home
                    </NavLink>
                </nav>
            </main>
            <Footer />
        </div>
    );
}
