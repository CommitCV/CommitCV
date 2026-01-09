import { NavLink } from "react-router";
import Header from "@components/header";
import Footer from "@components/footer";
import ThemeSwitcher from "@components/theme-switcher";
import ThemedCard from "@components/themed-card";

export default function Home() {
    return (
        <>
            <Header />
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 gap-8">
                <h1 className="text-4xl font-bold tracking-tight">CommitCV</h1>

                <p className="text-sm text-gray-500">
                    Your Resume made easy, Wherever you go, Owned by you,
                    Version controlled
                </p>

                <ThemeSwitcher />
                <ThemedCard title="hey" />

                <nav>
                    <NavLink
                        to="/about"
                        end>
                        About
                    </NavLink>
                </nav>
            </div>
            <Footer />
        </>
    );
}
