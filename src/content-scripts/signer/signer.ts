// Signs and sends what the page script finds. This install's key is kept in
// extension storage, which scripts on the page can't read, and every request
// carries a signature made with it.
import type { SignedPost } from "@/lib/api";

const API = import.meta.env.VITE_API_URL;
const VERSION = chrome.runtime.getManifest().version + (import.meta.env.VITE_VERSION_SUFFIX ?? "");
const PATHS: SignedPost["path"][] = ["/ingest/products", "/ingest/clicks", "/ingest/product-page"];
const ECDSA = { name: "ECDSA", namedCurve: "P-256" };

interface Install {
    privateKey: JsonWebKey;
    publicKey: string; // SPKI, base64url
    keyId?: string; // set once the API has registered the key
}

const base64url = (bytes: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const call = async (path: string, init: RequestInit = {}) => {
    const resp = await fetch(`${API}${path}`, {
        credentials: "omit",
        ...init,
        headers: { "Content-Type": "application/json", "X-Pasaley-Version": VERSION, ...init.headers },
    });
    if (!resp.ok) throw new Error(`${path}: HTTP ${resp.status}`);
    return resp.json();
};

// Made on first use (after install or the update that added it), then
// registered with the API. Registering again is safe, so a failed attempt is
// simply retried on a later page.
const loadInstall = async (): Promise<Install & { keyId: string }> => {
    let { install } = await chrome.storage.local.get("install") as { install?: Install };
    if (!install) {
        const keys = await crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"]) as CryptoKeyPair;
        install = {
            privateKey: await crypto.subtle.exportKey("jwk", keys.privateKey),
            publicKey: base64url(await crypto.subtle.exportKey("spki", keys.publicKey)),
        };
        await chrome.storage.local.set({ install });
    }
    if (!install.keyId) {
        const resp = await call("/keys", { method: "POST", body: JSON.stringify({ publicKey: install.publicKey }) });
        install = { ...install, keyId: resp.data.keyId as string };
        await chrome.storage.local.set({ install });
    }
    return install as Install & { keyId: string };
};

let install: ReturnType<typeof loadInstall> | undefined;

// When loading fails (offline, or the API is down), the next requests fail too,
// and the install is loaded again a minute later rather than on every request.
const RETRY_AFTER = 60 * 1000;

const send = async (path: SignedPost["path"], body: object) => {
    install ??= loadInstall().catch((err) => { setTimeout(() => { install = undefined; }, RETRY_AFTER); throw err; });
    const { privateKey, keyId } = await install;

    const json = JSON.stringify(body);
    const nonce = crypto.randomUUID();
    const message = `${nonce}\nPOST ${new URL(`${API}${path}`).pathname}\n${json}`;
    const key = await crypto.subtle.importKey("jwk", privateKey, ECDSA, false, ["sign"]);
    const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(message));

    await call(path, {
        method: "POST",
        body: json,
        headers: {
            "X-Pasaley-Key": keyId,
            "X-Pasaley-Nonce": nonce,
            "X-Pasaley-Signature": base64url(signature),
        },
    });
};

window.addEventListener("message", (event: MessageEvent<SignedPost>) => {
    if (event.source !== window || event.data?.type !== "pasaley:post" || !PATHS.includes(event.data.path)) return;
    send(event.data.path, event.data.body).catch(console.error);
});
