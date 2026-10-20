import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RemoteFiles from "@components/connect/remote-files";
import { useRemoteEntries } from "@components/connect/use-remote-entries";
import { connections, type IConnection } from "../../git/connections";

function Repo({ connection }: { connection: IConnection }) {
    const { entries, error, reload } = useRemoteEntries(connection.id);
    return (
        <section
            data-testid="remote-repo"
            className="rounded-md border-2 border-border-light p-4 dark:border-border-dark">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
                {connection.label}
                <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-light-50 dark:text-dark-50">
                    Remote
                </span>
            </h3>
            <RemoteFiles
                connectionId={connection.id}
                entries={entries}
                error={error}
                onRetry={reload}
            />
        </section>
    );
}

/** Resumes in connected git repositories, each loaded lazily. */
export default function RemoteResumes() {
    const [items, setItems] = useState<IConnection[]>([]);
    useEffect(() => {
        let active = true;
        connections
            .list()
            .then((all) => active && setItems(all))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    return (
        <section
            aria-label="Remote repositories"
            className="space-y-3">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight">
                    Remote repositories
                </h2>
                <Link
                    to="/connect"
                    className="rounded-md border border-border-light px-3 py-1.5 text-sm font-semibold hover:bg-light-200 dark:border-border-dark dark:hover:bg-dark-100">
                    Connect a repository
                </Link>
            </div>
            {items.map((item) => (
                <Repo
                    key={item.id}
                    connection={item}
                />
            ))}
        </section>
    );
}
