import Logo from "@components/ui/logo";

export default function Footer() {
    return (
        <footer className="backdrop-blur-sm bg-light-50 dark:bg-dark-50 border-t-4 border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3 px-8 py-12 max-w-screen-xl mx-auto">
                <span className="text-lg font-light text-light-950/50 dark:text-dark-950/50">
                    © {new Date().getFullYear()}
                </span>
                <Logo size="sm" />
            </div>
        </footer>
    );
}
