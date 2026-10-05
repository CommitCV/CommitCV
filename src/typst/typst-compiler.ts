import { createTypstCompiler } from "@myriaddreamin/typst.ts/compiler";
import type { TypstCompiler as TypstCompilerService } from "@myriaddreamin/typst.ts/compiler";
import { createTypstRenderer } from "@myriaddreamin/typst.ts/renderer";
import type { TypstRenderer } from "@myriaddreamin/typst.ts/renderer";
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import rendererWasmUrl from "@myriaddreamin/typst-ts-renderer/wasm?url";

const FONTS = [
    "NewCM10-Regular.otf",
    "NewCM10-Italic.otf",
    "NewCM10-Bold.otf",
    "NewCM10-BoldItalic.otf",
    "fa-solid-900.otf",
    "fa-brands-400.otf",
    "fa-regular-400.otf",
].map((name) => `/fonts/${name}`);

// Template sources mapped into the compiler's in-memory file system.
// Keys are public paths, values are virtual paths.
const TEMPLATE_FILES: Record<string, string> = {
    "/typst/jake.typ": "/jake.typ",
    "/typst/fontawesome/lib.typ": "/fontawesome/lib.typ",
    "/typst/fontawesome/lib-impl.typ": "/fontawesome/lib-impl.typ",
    "/typst/fontawesome/lib-gen-map.typ": "/fontawesome/lib-gen-map.typ",
    "/typst/fontawesome/lib-gen-func.typ": "/fontawesome/lib-gen-func.typ",
};

const encoder = new TextEncoder();

/**
 * Browser-side Typst compiler. Fonts, templates, and the Font Awesome
 * icon set are all served from this app (nothing loads from a CDN),
 * matching the local-first, private-by-default product promise.
 */
export class TypstCompiler {
    private compiler: TypstCompilerService | null = null;
    private renderer: TypstRenderer | null = null;
    private ready: Promise<void> | null = null;

    init(): Promise<void> {
        this.ready ??= this.doInit().catch((error: unknown) => {
            this.ready = null;
            throw error;
        });
        return this.ready;
    }

    // ponytail: compiles on the main thread; move to a Worker if typing lags
    async renderSvg(source: string): Promise<string> {
        await this.init();
        const artifact = await this.compile(source, 0);
        return this.renderer!.renderSvg({
            format: "vector",
            artifactContent: artifact,
        });
    }

    async renderPdf(source: string): Promise<Uint8Array> {
        await this.init();
        return this.compile(source, 1);
    }

    private async doInit(): Promise<void> {
        const fonts = await Promise.all(FONTS.map(loadBytes));

        const compiler = createTypstCompiler();
        await compiler.init({
            getModule: () => compilerWasmUrl,
            beforeBuild: [
                async (_compiler, { builder }) => {
                    for (const font of fonts) await builder.add_raw_font(font);
                },
            ],
        });

        const renderer = createTypstRenderer();
        await renderer.init({
            getModule: () => rendererWasmUrl,
            beforeBuild: [
                async (_renderer, { builder }) => {
                    for (const font of fonts) await builder.add_raw_font(font);
                },
            ],
        });

        for (const [publicPath, virtualPath] of Object.entries(
            TEMPLATE_FILES,
        )) {
            compiler.mapShadow(virtualPath, await loadBytes(publicPath));
        }

        this.compiler = compiler;
        this.renderer = renderer;
    }

    private async compile(source: string, format: 0 | 1): Promise<Uint8Array> {
        const compiler = this.compiler!;
        compiler.mapShadow("/main.typ", encoder.encode(source));
        const result = await compiler.compile({
            mainFilePath: "/main.typ",
            format,
        });
        const artifact = result?.result;
        if (!artifact) {
            throw new Error(describeDiagnostics(result));
        }
        return artifact;
    }
}

async function loadBytes(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`failed to load ${url}`);
    return new Uint8Array(await response.arrayBuffer());
}

function describeDiagnostics(result: unknown): string {
    const diagnostics = (result as { diagnostics?: unknown }).diagnostics;
    if (typeof diagnostics === "string") return diagnostics;
    if (Array.isArray(diagnostics)) {
        return diagnostics
            .map((diagnostic) =>
                typeof diagnostic === "string"
                    ? diagnostic
                    : JSON.stringify(diagnostic),
            )
            .join("\n");
    }
    return "Typst compilation failed";
}

/** Shared instance; the WASM compiler is too heavy to load twice. */
export const typst = new TypstCompiler();
