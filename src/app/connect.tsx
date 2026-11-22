import { useCallback, useEffect, useState } from "react";
import Header from "@components/header";
import Footer from "@components/footer";
import ConnectForm from "@components/connect/connect-form";
import NewRemoteResume from "@components/connect/new-remote-resume";
import RemoteFiles from "@components/connect/remote-files";
import TemplateOffer from "@components/connect/template-offer";
import { useRemoteEntries } from "@components/connect/use-remote-entries";
import { connections, type IConnection } from "../git/connections";

function RepoPanel({ connection }: { connection: IConnection }) {
    const { entries, error, reload } = useRemoteEntries(connection.id);
    return (
        <section className="rounded-lg border border-border-light p-4 dark:border-border-dark">
            <h2 className="mb-3 text-lg font-semibold">{connection.label}</h2>
            <RemoteFiles
                connectionId={connection.id}
                entries={entries}
                error={error}
                onRetry={reload}
            />
            {entries && (
                <NewRemoteResume
                    connectionId={connection.id}
                    existing={entries.map((e) => e.id)}
                />
            )}
        </section>
    );
}

export default function Connect() {
    const [items, setItems] = useState<IConnection[]>([]);
    const [selectedId, setSelectedId] = useState<string>();

    const refresh = useCallback(() => connections.list().then(setItems), []);
    useEffect(() => {
        let active = true;
        void connections.list().then((all) => active && setItems(all));
        return () => {
            active = false;
        };
    }, []);

    const selected = items.find((item) => item.id === selectedId);

    return (
        <div className="flex min-h-screen flex-col bg-light-100 text-light-950 dark:bg-dark-300 dark:text-dark-950">
            <Header />
            <main className="mx-auto w-full max-w-xl flex-1 space-y-6 px-8 py-10">
                <h1 className="text-center text-4xl font-bold tracking-tight">
                    Connect a repository
                </h1>
                <p className="text-center text-light-700 dark:text-dark-700">
                    Keep your resumes in any git repository you can reach over
                    https. Each save becomes a commit.
                </p>
                <section className="rounded-lg border border-border-light p-4 dark:border-border-dark">
                    <ConnectForm
                        onConnected={(connection) => {
                            void refresh();
                            setSelectedId(connection.id);
                        }}
                    />
                </section>
                <TemplateOffer />
                {selected && (
                    <RepoPanel
                        key={selected.id}
                        connection={selected}
                    />
                )}
            </main>
            <Footer />
        </div>
    );
}
