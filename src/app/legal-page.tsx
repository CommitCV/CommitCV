import { useMemo } from "react";
import { marked } from "marked";
import Header from "@components/header";
import Footer from "@components/footer";

interface LegalPageProps {
    source: string;
}

const articleClass =
    "mx-auto w-full max-w-3xl px-8 py-12 leading-relaxed space-y-4 " +
    "[&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight " +
    "[&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold " +
    "[&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold " +
    "[&_a]:text-accent [&_a]:underline " +
    "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 " +
    "[&_table]:block [&_table]:overflow-x-auto [&_th]:border-b [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left " +
    "[&_td]:border-b [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top";

export default function LegalPage({ source }: LegalPageProps) {
    const html = useMemo(
        () => marked.parse(source, { async: false }),
        [source],
    );

    return (
        <div className="min-h-screen flex flex-col bg-light-100 dark:bg-dark-300 text-light-950 dark:text-dark-950">
            <Header />
            <main className="flex-1">
                <article
                    className={articleClass}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </main>
            <Footer />
        </div>
    );
}
