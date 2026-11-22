import type { GitIdentity } from "./identity";
import { authFor, corsProxyFor, type RemoteConfig } from "./remote-config";

/** Loads isomorphic-git lazily so it stays out of the main bundle. */
export async function loadGit(
    config: RemoteConfig,
    author: GitIdentity,
    origin = window.location.origin,
) {
    // isomorphic-git reads the global Buffer in the browser and throws without it.
    const { Buffer } = await import("buffer");
    globalThis.Buffer ??= Buffer;
    const [{ GitClient }, { default: http }, { default: LightningFS }] =
        await Promise.all([
            import("./git-client"),
            import("isomorphic-git/http/web"),
            import("@isomorphic-git/lightning-fs"),
        ]);
    return new GitClient({
        fs: new LightningFS("commitcv-git"),
        http,
        corsProxy: corsProxyFor(origin),
        auth: authFor(config),
        author,
    });
}
