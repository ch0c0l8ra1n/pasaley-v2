import { useState } from "react";

// Shown under the chart when a product has little history: asks people to tell
// others about Pasaley, since history comes from what its users see.
const STORE = navigator.userAgent.includes("Firefox")
    ? "https://addons.mozilla.org/firefox/addon/pasaley/"
    : "https://chromewebstore.google.com/detail/bfnanpnikodnmncpnhdolkjdpjkkhlce";
const LINK = `${STORE}?utm_source=pasaley-share`;
const MESSAGE = `I check Daraz price history with Pasaley before buying. It's free: ${LINK}`;

const DISMISSED = "pasaley:share-dismissed";
const HIDE_FOR_MS = 3 * 24 * 60 * 60 * 1000;

const dismissedRecently = () => {
    try {
        return Date.now() - Number(localStorage.getItem(DISMISSED) ?? 0) < HIDE_FOR_MS;
    } catch {
        return false;
    }
};

const SHARES = [
    { name: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(MESSAGE)}` },
    { name: "Viber", url: `viber://forward?text=${encodeURIComponent(MESSAGE)}` },
    { name: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(LINK)}` },
];

const SharePrompt = () => {
    const [hidden, setHidden] = useState(dismissedRecently);
    const [copied, setCopied] = useState(false);
    if (hidden) return null;

    const dismiss = () => {
        try { localStorage.setItem(DISMISSED, String(Date.now())); } catch { /* still hide for now */ }
        setHidden(true);
    };
    const copy = async () => {
        await navigator.clipboard.writeText(LINK);
        setCopied(true);
    };

    return (
        <div className="mx-3 mb-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-zinc-700">
            <div className="flex items-start justify-between gap-2">
                <p>
                    <b>Not much history for this product yet.</b> Pasaley builds price history from what its users see on Daraz,
                    so every friend who uses it adds more for everyone. Check back in a few days.
                </p>
                <button className="cursor-pointer text-zinc-400 hover:text-zinc-700" onClick={dismiss} aria-label="Dismiss">✕</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold">Share Pasaley:</span>
                {SHARES.map((share) => (
                    <a key={share.name} href={share.url} target="_blank" rel="noreferrer"
                        className="rounded-full bg-white px-2.5 py-1 font-medium text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100">
                        {share.name}
                    </a>
                ))}
                <button onClick={copy} className="cursor-pointer rounded-full bg-white px-2.5 py-1 font-medium text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100">
                    {copied ? "Link copied" : "Copy link"}
                </button>
            </div>
        </div>
    );
};

export default SharePrompt;
