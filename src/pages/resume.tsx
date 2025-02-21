import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ProtectedPage() {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/github/session")
            .then((res) => res.json())
            .then((data) => {
                if (!data.authenticated) {
                    router.push("/"); // Redirect to homepage if not logged in
                } else {
                    setAuthenticated(true);
                }
            });
    }, [router]);

    if (authenticated === null) {
        return <p>Loading...</p>; // Show loading while checking
    }

    return (
        <div>
            <h1>Protected Page</h1>
            <p>You are logged in with GitHub!</p>
        </div>
    );
}
