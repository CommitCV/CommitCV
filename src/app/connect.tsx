import { useCallback, useEffect, useState } from "react";
import Header from "@components/header";
import Footer from "@components/footer";
import ProviderSignin from "@components/connect/provider-signin";
import ConnectForm from "@components/connect/connect-form";
import ConnectionList from "@components/connect/connection-list";
import NewRemoteResume from "@components/connect/new-remote-resume";
import RemoteFiles from "@components/connect/remote-files";
import TemplateOffer from "@components/connect/template-offer";
import { useRemoteEntries } from "@components/connect/use-remote-entries";
import { connections, type IConnection } from "../git/connections";
import { hasUnsyncedEdits, sessions } from "../git/sessions";
import { forgetGitStorage } from "@store/useResumeStore";

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

    const [unsyncedIds, setUnsyncedIds] = useState<ReadonlySet<string>>(
        new Set(),
    );

    const load = useCallback(async () => {
        const [list, all] = await Promise.all([
            connections.list(),
            sessions.list(),
        ]);
        const unsynced = new Set(
            all.filter(hasUnsyncedEdits).map((s) => s.connectionId),
        );
        return { list, unsynced };
    }, []);
    const refresh = useCallback(
        () =>
            load().then(({ list, unsynced }) => {
                setItems(list);
                setUnsyncedIds(unsynced);
            }),
        [load],
    );
    useEffect(() => {
        let active = true;
        void load().then(({ list, unsynced }) => {
            if (!active) return;
            setItems(list);
            setUnsyncedIds(unsynced);
        });
        return () => {
            active = false;
        };
    }, [load]);

    const selected = items.find((item) => item.id === selectedId);

    return (
        <div className="flex min-h-screen flex-col bg-light-100 text-light-950 dark:bg-dark-300 dark:text-dark-950">
            <Header />
            <main className="mx-auto w-full max-w-screen-xl flex-1 space-y-6 px-8 py-10">
                <h1 className="text-4xl font-bold tracking-tight">
                    Connect a repository
                </h1>
                <p className="max-w-2xl text-light-700 dark:text-dark-700">
                    Keep your resumes in any git repository you can reach over
                    https. Each save becomes a commit.
                </p>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-6">
                        <ProviderSignin
                            onConnected={(connection) => {
                                void refresh();
                                setSelectedId(connection.id);
                            }}
                        />
                        <section className="rounded-lg border border-border-light p-4 dark:border-border-dark">
                            <ConnectForm
                                onConnected={(connection) => {
                                    void refresh();
                                    setSelectedId(connection.id);
                                }}
                            />
                        </section>
                        <TemplateOffer />
                    </div>
                    <div className="space-y-6">
                        {items.length > 0 && (
                            <section className="rounded-lg border border-border-light p-4 dark:border-border-dark">
                                <h2 className="mb-3 text-lg font-semibold">
                                    Saved connections
                                </h2>
                                <ConnectionList
                                    items={items}
                                    unsyncedIds={unsyncedIds}
                                    selectedId={selectedId}
                                    onSelect={setSelectedId}
                                    onRemove={(id) => {
                                        forgetGitStorage(id);
                                        if (id === selectedId) {
                                            setSelectedId(undefined);
                                        }
                                        void connections
                                            .remove(id)
                                            .then(refresh);
                                    }}
                                />
                            </section>
                        )}
                        {selected && (
                            <RepoPanel
                                key={selected.id}
                                connection={selected}
                            />
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
