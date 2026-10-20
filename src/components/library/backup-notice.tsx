import { useCallback, useEffect, useState } from "react";
import Button from "@components/ui/button";
import { formatBytes } from "@resume/library-entries";
import {
    persistenceStatus,
    requestPersistence,
    type IPersistenceStatus,
} from "@storage/persistence";

const DISMISSED_KEY = "commitcv:library-backup-dismissed";

function wasDismissed(): boolean {
    try {
        return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
        return false;
    }
}

export default function BackupNotice() {
    const [dismissed, setDismissed] = useState(wasDismissed);
    const [status, setStatus] = useState<IPersistenceStatus>();

    const refresh = useCallback(
        async () => setStatus(await persistenceStatus()),
        [],
    );
    useEffect(() => {
        void persistenceStatus().then(setStatus);
    }, []);

    function dismiss() {
        setDismissed(true);
        try {
            localStorage.setItem(DISMISSED_KEY, "1");
        } catch {
            // Dismissal just won't be remembered.
        }
    }

    return (
        <div className="space-y-3">
            {!dismissed && (
                <div
                    role="region"
                    aria-label="Backup warning"
                    className="flex items-start gap-4 rounded-md border-2 border-border-light bg-light-200 p-4 dark:border-border-dark dark:bg-dark-100">
                    <p className="flex-1 text-sm">
                        <strong>Your resumes live only in this browser.</strong>{" "}
                        Clearing site data or cache will delete them. Download
                        your resumes as files to keep a backup.
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={dismiss}>
                        Dismiss
                    </Button>
                </div>
            )}
            {status?.supported && (
                <p
                    data-testid="persistence-status"
                    className="flex flex-wrap items-center gap-3 text-sm text-light-700 dark:text-dark-700">
                    {status.persisted ? (
                        <span>
                            Protected from automatic cleanup. Clearing site data
                            manually can still delete your resumes.
                        </span>
                    ) : (
                        <>
                            <span>
                                Not protected: the browser may remove this data
                                when disk space is low.
                            </span>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    void requestPersistence().then(refresh)
                                }>
                                Protect storage
                            </Button>
                        </>
                    )}
                    {status.usage !== undefined &&
                        status.quota !== undefined && (
                            <span>
                                Using {formatBytes(status.usage)} of{" "}
                                {formatBytes(status.quota)}
                            </span>
                        )}
                </p>
            )}
        </div>
    );
}
