import PriceChart from '@/components/chart/price-chart';
import { useEffect, useState } from 'react';
import ChartAppLayout from '@/components/chart-app-layout';
import API, { PriceHistory, TooManyRequests } from '@/lib/api';
import { PageSkus, watchSkus } from '@/lib/skus';
import { priceLines } from '@/lib/variants';
import SharePrompt from '@/components/share-prompt';
const api = new API();

interface ChartAppProps {
    productId: string;
    hostCountry: string;
}

// Save the original requestAnimationFrame
const originalRAF = window.requestAnimationFrame;

// Bind requestAnimationFrame to the correct window object
window.requestAnimationFrame = originalRAF.bind(window);

type Point = [number, number];

const byTime = (prices: PriceHistory["prices"]) => prices
    .map((price): Point => [new Date(price.time).getTime(), price.price])
    .sort((a, b) => a[0] - b[0]);

const ChartApp = ({productId,hostCountry}: ChartAppProps) => {

    const [history, setHistory] = useState<PriceHistory>({ prices: [], skus: [] });
    const [loading, setLoading] = useState<boolean>(true);
    const [pageSkus, setPageSkus] = useState<PageSkus>({ skus: [] });
    const [showAll, setShowAll] = useState(false);
    const [retryIn, setRetryIn] = useState<number | null>(null);

    const load = async () => {
        try {
            setHistory(await api.getPriceHistory(productId, hostCountry));
            setRetryIn(null);
        } catch (err) {
            if (!(err instanceof TooManyRequests)) throw err;
            setRetryIn(err.retryAfter);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, [])

    // Counts down, then tries again.
    useEffect(() => {
        if (retryIn === null) return;
        if (retryIn <= 0) { load(); return; }
        const timer = setTimeout(() => setRetryIn(retryIn - 1), 1000);
        return () => clearTimeout(timer);
    }, [retryIn])

    useEffect(() => watchSkus(setPageSkus), []);

    // The selected variant's prices; all of them when it has none yet, or the
    // product has no variants we know of.
    const selected = pageSkus.selected;
    const own = selected ? history.prices.filter((price) => price.skuId === selected) : [];
    const hasVariants = pageSkus.skus.length > 1;
    const variantView = hasVariants && !showAll && own.length > 0;

    const knownName = (skuId: string | null | undefined) =>
        (skuId && (pageSkus.skus.find((s) => s.skuId === skuId)?.name ?? history.skus.find((s) => s.skuId === skuId)?.name)) || undefined;
    const nameOf = (skuId: string | null | undefined) => knownName(skuId) ?? (skuId ? `Variant ${skuId}` : "Variant not known");

    const series = variantView
        ? [{ name: nameOf(selected), data: byTime(own), selected: true }]
        : !hasVariants
            ? [{ name: "Price", data: byTime(history.prices), selected: true }]
            : priceLines([...new Set(history.prices.map((p) => p.skuId ?? null))]
                .map((skuId) => ({ skuId, name: knownName(skuId), prices: byTime(history.prices.filter((p) => (p.skuId ?? null) === skuId)) })), selected);

    const note = hasVariants && !loading && (variantView
        ? <>Showing <b>{nameOf(selected)}</b>. <button className="underline cursor-pointer" onClick={() => setShowAll(true)}>Show all variants</button></>
        : own.length > 0
            ? <>Showing all variants. <button className="underline cursor-pointer" onClick={() => setShowAll(false)}>Show only {nameOf(selected)}</button></>
            : <>No history for {nameOf(selected)} yet. Showing all variants.</>);

    // Little history: under 5 prices, or seen over less than a week.
    const shownTimes = series.flatMap((s) => s.data.map(([time]) => time));
    const littleHistory = !loading && (shownTimes.length < 5 || Math.max(...shownTimes) - Math.min(...shownTimes) < 7 * 24 * 60 * 60 * 1000);

    const layout = {
        tab1: {
            title: "Price History",
            content: retryIn !== null
                ? <div className="flex h-[300px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-zinc-700">
                    <p className="text-base font-semibold">You're doing that too often</p>
                    <p>You've looked up a lot of prices in the last minute. Price history will load again in {Math.max(retryIn, 0)} seconds.</p>
                </div>
                : <>
                    {note && <p className="px-3 pt-1 text-xs">{note}</p>}
                    <PriceChart series={series} loading={loading} />
                    {littleHistory && <SharePrompt />}
                </>
        },
        tab2: {
            title: "Alerts",
            content: <div>Coming soon!</div>
        }
    }
    
    return (
        <ChartAppLayout layout={layout}/>
    );
}

export default ChartApp;