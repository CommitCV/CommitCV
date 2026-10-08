/** The messages the compile worker accepts. */
export interface IWorkerRequest {
    id: number;
    kind: "svg" | "pdf";
    source: string;
}

/** The worker's replies: rendered output, or the compile error. */
export type TWorkerResponse =
    | { id: number; ok: true; result: string | Uint8Array }
    | { id: number; ok: false; error: string };

/** A compile job, tracked from request to reply. */
interface IJob {
    id: number;
    kind: "svg" | "pdf";
    source: string;
    resolve: (result: string | Uint8Array) => void;
    reject: (error: Error) => void;
}

/**
 * Main-thread proxy for the Typst compile worker. Jobs run in the worker
 * one at a time; a newer preview render replaces an older queued one, so
 * fast typing only compiles the current resume. A crashed worker is
 * dropped, and the next request starts a fresh one.
 */
export class TypstClient {
    private worker: Worker | null = null;
    private inFlight: IJob | null = null;
    private queue: IJob[] = [];
    private nextId = 1;

    renderSvg(source: string): Promise<string> {
        return this.run("svg", source) as Promise<string>;
    }

    renderPdf(source: string): Promise<Uint8Array> {
        return this.run("pdf", source) as Promise<Uint8Array>;
    }

    private run(
        kind: "svg" | "pdf",
        source: string,
    ): Promise<string | Uint8Array> {
        const job = {
            id: this.nextId++,
            kind,
            source,
        } as IJob;
        const promise = new Promise<string | Uint8Array>((resolve, reject) => {
            job.resolve = resolve;
            job.reject = reject;
        });
        // Latest wins: a newer preview replaces an older queued one. PDF
        // requests are kept; a user is waiting on each of them.
        if (kind === "svg") {
            this.queue = this.queue.filter((queued) => {
                if (queued.kind !== "svg") return true;
                queued.reject(new Error("replaced by a newer render"));
                return false;
            });
        }
        this.queue.push(job);
        this.pump();
        return promise;
    }

    private pump(): void {
        if (this.inFlight || this.queue.length === 0) return;
        this.inFlight = this.queue.shift()!;
        this.ensureWorker().postMessage({
            id: this.inFlight.id,
            kind: this.inFlight.kind,
            source: this.inFlight.source,
        });
    }

    private onResponse(message: TWorkerResponse): void {
        const job = this.inFlight;
        this.inFlight = null;
        if (job?.id === message.id) {
            if (message.ok) job.resolve(message.result);
            else job.reject(new Error(message.error));
        }
        this.pump();
    }

    /** Rejects everything pending; the next request builds a new worker. */
    private onCrash(): void {
        const error = new Error("the Typst worker crashed");
        this.inFlight?.reject(error);
        this.inFlight = null;
        for (const job of this.queue) job.reject(error);
        this.queue = [];
        this.worker?.terminate();
        this.worker = null;
    }

    /** The worker loads the WASM compiler, so it is created on first use. */
    private ensureWorker(): Worker {
        if (this.worker) return this.worker;
        const worker = new Worker(
            new URL("./typst.worker.ts", import.meta.url),
            { type: "module" },
        );
        worker.onmessage = (event: MessageEvent<TWorkerResponse>) =>
            this.onResponse(event.data);
        worker.onerror = () => this.onCrash();
        this.worker = worker;
        return worker;
    }
}

/** Shared instance; one worker compiles for the preview and PDF export. */
export const typst = new TypstClient();
