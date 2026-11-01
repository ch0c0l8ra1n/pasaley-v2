// The extension's background worker: talks to the account API (the pasaley.com
// sign-in cookie goes along with its requests), and shows push notifications.
// The chart and the account page ask it for everything through messages.
export type AccountRequest =
    | { type: "account:me" }
    | { type: "account:alerts" }
    | { type: "account:setAlert"; id: string; hostCountry: string; targetPrice?: number }
    | { type: "account:removeAlert"; id: number }
    | { type: "account:logout" }
    | { type: "account:enablePush" }
    | { type: "account:disablePush" }
    | { type: "account:open"; page: "login" | "account" };

export type AccountResponse = { ok: true; data: any } | { ok: false; status: number; message: string };

const API = import.meta.env.VITE_API_URL;
const SITE = new URL(API).origin;
const VERSION = chrome.runtime.getManifest().version + (import.meta.env.VITE_VERSION_SUFFIX ?? "");
const worker = self as any; // ServiceWorkerGlobalScope: the page's DOM types don't include it

const call = async (path: string, init: RequestInit = {}): Promise<AccountResponse> => {
    const resp = await fetch(`${API}${path}`, {
        credentials: "include",
        ...init,
        headers: { "Content-Type": "application/json", "X-Pasaley-Version": VERSION },
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) return { ok: false, status: resp.status, message: json?.error?.message ?? "Something went wrong, try again" };
    return { ok: true, data: json?.data };
};

const post = (path: string, body: object = {}) => call(path, { method: "POST", body: JSON.stringify(body) });

const hasNotifications = () => chrome.permissions.contains({ permissions: ["notifications"] });

const base64UrlToBytes = (value: string) => {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

// Registers this browser for the signed-in account.
const enablePush = async (): Promise<AccountResponse> => {
    if (!await hasNotifications()) return { ok: false, status: 403, message: "Notifications are turned off" };
    const config = await call("/config");
    if (!config.ok) return config;
    const subscription = await worker.registration.pushManager.getSubscription()
        ?? await worker.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(config.data.pushPublicKey),
        });
    return post("/destinations/push", subscription.toJSON());
};

const disablePush = async (): Promise<AccountResponse> => {
    const subscription = await worker.registration.pushManager.getSubscription();
    if (!subscription) return { ok: true, data: null };
    const result = await post("/destinations/push/remove", { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
    return result;
};

const me = async (): Promise<AccountResponse> => {
    const result = await call("/me");
    if (!result.ok) return result;
    return { ok: true, data: { user: result.data.user, notifications: await hasNotifications() } };
};

const handle = async (request: AccountRequest): Promise<AccountResponse> => {
    switch (request.type) {
        case "account:me":
            return me();
        case "account:alerts":
            return call("/alerts");
        case "account:setAlert": {
            const { id, hostCountry, targetPrice } = request;
            const result = await post("/alerts", { id, hostCountry, targetPrice });
            // This browser may have signed in to a different account since it subscribed.
            if (result.ok && await hasNotifications()) await enablePush().catch(console.error);
            return result;
        }
        case "account:removeAlert":
            return call(`/alerts/${request.id}`, { method: "DELETE" });
        case "account:logout":
            await disablePush().catch(console.error);
            return post("/auth/logout");
        case "account:enablePush":
            return enablePush();
        case "account:disablePush":
            return disablePush();
        case "account:open":
            await chrome.tabs.create({ url: request.page === "login" ? `${SITE}/login` : chrome.runtime.getURL("account.html") });
            return { ok: true, data: null };
    }
};

chrome.runtime.onMessage.addListener((request: AccountRequest, sender, respond) => {
    if (sender.id !== chrome.runtime.id || !request?.type?.startsWith("account:")) return;
    handle(request)
        .catch((err): AccountResponse => {
            console.error(err);
            return { ok: false, status: 0, message: "Couldn't reach Pasaley, try again" };
        })
        .then(respond);
    return true;
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("account.html") });
});

worker.addEventListener("push", (event: any) => {
    const { title, body, url } = event.data!.json();
    event.waitUntil(worker.registration.showNotification(title, {
        body,
        icon: chrome.runtime.getURL("logo.png"),
        data: { url },
    }));
});

worker.addEventListener("notificationclick", (event: any) => {
    event.notification.close();
    const url = new URL(event.notification.data.url);
    if (/^www\.daraz\.(com\.np|pk|com\.bd|lk)$/.test(url.hostname)) event.waitUntil(chrome.tabs.create({ url: url.href }));
});

// The browser replaced the subscription: tell the API about the new one.
worker.addEventListener("pushsubscriptionchange", (event: any) => {
    event.waitUntil(enablePush().catch(console.error));
});
