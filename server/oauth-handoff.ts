import { randomBytes } from "node:crypto";

export interface HandoffPayload {
    provider: string;
    host: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    user: { name: string; email?: string; login: string };
}

interface Entry {
    payload: HandoffPayload;
    expires: number;
}

/**
 * One-time, in-memory token handoff. The token exists only here between the
 * OAuth callback and the page's single `take`; nothing is persisted.
 */
export class HandoffStore {
    private readonly entries = new Map<string, Entry>();

    private readonly now: () => number;
    private readonly ttlMs: number;
    private readonly maxEntries: number;

    constructor(
        now: () => number = Date.now,
        ttlMs = 60_000,
        maxEntries = 1000,
    ) {
        this.now = now;
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
    }

    /** Returns the nonce, or undefined when the store is full of live entries. */
    put(payload: HandoffPayload): string | undefined {
        this.sweep();
        if (this.entries.size >= this.maxEntries) return undefined;
        const nonce = randomBytes(32).toString("base64url");
        this.entries.set(nonce, {
            payload,
            expires: this.now() + this.ttlMs,
        });
        return nonce;
    }

    /** Single use: the entry is gone after this call, hit or miss. */
    take(nonce: string): HandoffPayload | undefined {
        const entry = this.entries.get(nonce);
        this.entries.delete(nonce);
        if (!entry || entry.expires <= this.now()) return undefined;
        return entry.payload;
    }

    private sweep() {
        const now = this.now();
        for (const [nonce, entry] of this.entries) {
            if (entry.expires <= now) this.entries.delete(nonce);
        }
    }
}
