import { TEMPLATE_REPO_URL } from "../../git/template";

/** Hidden unless `VITE_TEMPLATE_REPO_URL` is set. */
export default function TemplateOffer() {
    if (!TEMPLATE_REPO_URL) return null;
    return (
        <section className="rounded-lg border border-border-light p-4 dark:border-border-dark">
            <h2 className="text-lg font-semibold">
                Create from the CommitCV template
            </h2>
            <p className="mt-1 text-sm text-light-700 dark:text-dark-700">
                Optional, and only for attribution: fork the template or use it
                to create your own repository on your git host, then connect
                that repository here.
            </p>
            <a
                href={TEMPLATE_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-accent underline">
                Open the template repository
            </a>
        </section>
    );
}
