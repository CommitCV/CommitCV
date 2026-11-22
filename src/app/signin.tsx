import { Link, useNavigate } from "react-router-dom";
import Header from "@components/header";
import Footer from "@components/footer";
import ProviderSignin from "@components/connect/provider-signin";

/** Sign in with a git host, pick a repository, then land in the library. */
export default function SignIn() {
    const navigate = useNavigate();
    return (
        <div className="flex min-h-screen flex-col bg-light-100 text-light-950 dark:bg-dark-300 dark:text-dark-950">
            <Header />
            <main className="mx-auto w-full max-w-xl flex-1 space-y-6 px-8 py-10">
                <h1 className="text-center text-4xl font-bold tracking-tight">
                    Sign in
                </h1>
                <p className="text-center text-light-700 dark:text-dark-700">
                    Your resumes are saved as commits in a git repository you
                    own.
                    <br />
                    Sign in with your git host to choose one.
                </p>
                <ProviderSignin
                    standalone
                    returnTo="/signin"
                    onConnected={() => navigate("/library")}
                />
                <p className="text-center text-sm text-light-700 dark:text-dark-700">
                    <Link
                        to="/library"
                        className="underline">
                        Continue without signing in
                    </Link>
                    {" · "}
                    <Link
                        to="/connect"
                        className="underline">
                        Use an access token instead
                    </Link>
                </p>
            </main>
            <Footer />
        </div>
    );
}
