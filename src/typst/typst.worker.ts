import { TypstCompiler } from "./typst-compiler";
import type { IWorkerRequest, TWorkerResponse } from "./typst-client";

/** One compiler serves every render request; the WASM is heavy to load. */
const typst = new TypstCompiler();

// The DOM lib types `self` as a window, so the worker scope is typed by hand.
const scope = self as unknown as {
    onmessage: ((event: MessageEvent<IWorkerRequest>) => void) | null;
    postMessage(message: TWorkerResponse, transfer?: Transferable[]): void;
};

scope.onmessage = async (event) => {
    const { id, kind, source } = event.data;
    try {
        if (kind === "svg") {
            scope.postMessage({
                id,
                ok: true,
                result: await typst.renderSvg(source),
            });
        } else {
            // Copy in case the compiler returned a view into its WASM
            // memory, which cannot be transferred.
            const pdf = (await typst.renderPdf(source)).slice();
            scope.postMessage({ id, ok: true, result: pdf }, [pdf.buffer]);
        }
    } catch (error) {
        scope.postMessage({
            id,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
