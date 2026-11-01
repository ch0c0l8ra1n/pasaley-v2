import { useEffect, useRef, useState } from "react";
import type { AccountRequest, AccountResponse } from "@/background/background";

const ask = (request: AccountRequest) => chrome.runtime.sendMessage(request) as Promise<AccountResponse>;

interface AlertsTabProps {
    productId: string;
    hostCountry: string;
}

// Asks the API for nothing until the tab is actually opened.
const useFirstShown = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setShown(true);
        }, { threshold: 0.5 });
        observer.observe(ref.current!);
        return () => observer.disconnect();
    }, []);
    return { ref, shown };
};

const AlertsTab = ({ productId, hostCountry }: AlertsTabProps) => {
    const { ref, shown } = useFirstShown();
    const [state, setState] = useState<{ user: { email: string } | null; notifications: boolean; alert?: any } | null>(null);
    const [target, setTarget] = useState("");
    const [error, setError] = useState("");

    const load = async () => {
        const me = await ask({ type: "account:me" });
        if (!me.ok) return setError(me.message);
        if (!me.data.user) return setState({ user: null, notifications: false });

        const alerts = await ask({ type: "account:alerts" });
        if (!alerts.ok) return setError(alerts.message);
        const alert = alerts.data.alerts.find((a: any) => a.darazId === productId && a.hostCountry === hostCountry);
        setState({ ...me.data, alert });
    };

    useEffect(() => {
        if (!shown) return;
        load();
        // Signing in or turning on notifications happens in another tab.
        const onFocus = () => load();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [shown]);

    const setAlert = async (targetPrice?: number) => {
        setError("");
        const result = await ask({ type: "account:setAlert", id: productId, hostCountry, targetPrice });
        if (!result.ok) return setError(result.message);
        setTarget("");
        await load();
    };

    const removeAlert = async () => {
        setError("");
        const result = await ask({ type: "account:removeAlert", id: state!.alert.id });
        if (!result.ok) return setError(result.message);
        await load();
    };

    const button = "px-3 py-1 rounded border border-gray-400 text-sm cursor-pointer";

    return (
        <div ref={ref} className="flex flex-col gap-2 p-3 text-sm">
            {error && <p role="alert" className="text-red-600">{error}</p>}
            {state && !state.user && (
                <>
                    <p>Sign in to get a notification when this price drops.</p>
                    <div><button className={button} onClick={() => ask({ type: "account:open", page: "login" })}>Log in or register</button></div>
                    <p className="text-xs">Signed in already? Allow cookies for pasaley.com in your browser settings.</p>
                </>
            )}
            {state?.user && !state.notifications && (
                <div className="flex items-center justify-between gap-2">
                    <span>Notifications are off, so alerts can't reach you.</span>
                    <button className={button} onClick={() => ask({ type: "account:open", page: "account" })}>Turn on</button>
                </div>
            )}
            {state?.user && state.alert && (
                <div className="flex items-center justify-between gap-2">
                    <span>Alert set: at or below {state.alert.targetPrice}</span>
                    <button className={button} onClick={removeAlert}>Remove</button>
                </div>
            )}
            {state?.user && (
                <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => {
                    event.preventDefault();
                    const value = Number(target);
                    if (value > 0) setAlert(value);
                }}>
                    <input
                        aria-label="Target price" type="number" min="1" step="any" placeholder="Target price" required
                        value={target} onChange={(event) => setTarget(event.target.value)}
                        className="w-28 px-2 py-1 rounded border border-gray-400 bg-transparent"
                    />
                    <button className={button}>{state.alert ? "Change" : "Alert me"}</button>
                    <button type="button" className={button} onClick={() => setAlert()}>Any drop</button>
                </form>
            )}
        </div>
    );
};

export default AlertsTab;
