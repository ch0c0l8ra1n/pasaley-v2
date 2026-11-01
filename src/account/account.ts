import type { AccountRequest, AccountResponse } from "@/background/background";

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ask = (request: AccountRequest) => chrome.runtime.sendMessage(request) as Promise<AccountResponse>;

const showError = (message: string) => {
    element("error").textContent = message;
    element("error").hidden = !message;
};

const renderAlerts = async () => {
    const result = await ask({ type: "account:alerts" });
    if (!result.ok) return showError(result.message);

    const list = element("alerts");
    list.replaceChildren(...result.data.alerts.map((alert: any) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = alert.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = `${alert.name ?? "Product"}: at or below ${alert.targetPrice}`;
        const remove = document.createElement("button");
        remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
            const removed = await ask({ type: "account:removeAlert", id: alert.id });
            if (!removed.ok) return showError(removed.message);
            await renderAlerts();
        });
        item.append(link, remove);
        return item;
    }));
    element("no-alerts").hidden = result.data.alerts.length > 0;
};

const render = async () => {
    const result = await ask({ type: "account:me" });
    if (!result.ok) return showError(result.message);
    const { user, notifications } = result.data;

    element("signed-out").hidden = !!user;
    element("signed-in").hidden = !user;
    element("notifications").hidden = !user;
    element("alerts-section").hidden = !user;
    if (!user) return;

    element("email").textContent = user.email;
    element("notifications-status").textContent = notifications
        ? "Notifications are on for this browser."
        : "Turn on notifications to get your alerts.";
    element("enable-notifications").hidden = notifications;
    await renderAlerts();
};

element("login").addEventListener("click", () => ask({ type: "account:open", page: "login" }));

element("logout").addEventListener("click", async () => {
    const result = await ask({ type: "account:logout" });
    if (!result.ok) return showError(result.message);
    await render();
});

// Only an extension page may ask for this, and only right after a click.
element("enable-notifications").addEventListener("click", async () => {
    showError("");
    const granted = await chrome.permissions.request({ permissions: ["notifications"] });
    if (!granted) return showError("Chrome didn't allow notifications");
    const result = await ask({ type: "account:enablePush" });
    if (!result.ok) showError(result.message);
    await render();
});

// Signing in happens in another tab.
window.addEventListener("focus", () => render());
render();
