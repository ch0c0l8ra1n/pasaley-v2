import PriceChart from '@/components/chart/price-chart';
import { useEffect, useState } from 'react';
import ChartAppLayout from '@/components/chart-app-layout';
import API, { PriceHistory } from '@/lib/api';
import { PageSkus, watchSkus } from '@/lib/skus';
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

    useEffect(() => { (async () => {
        setHistory(await api.getPriceHistory(productId, hostCountry));
        setLoading(false);
    })()}, [])

    useEffect(() => watchSkus(setPageSkus), []);

    // The selected variant's prices; all of them when it has none yet, or the
    // product has no variants we know of.
    const selected = pageSkus.selected;
    const own = selected ? history.prices.filter((price) => price.skuId === selected) : [];
    const hasVariants = pageSkus.skus.length > 1;
    const variantView = hasVariants && !showAll && own.length > 0;

    const nameOf = (skuId: string | null | undefined) =>
        (skuId && (pageSkus.skus.find((s) => s.skuId === skuId)?.name ?? history.skus.find((s) => s.skuId === skuId)?.name))
        || (skuId ? `Variant ${skuId}` : "Variant not known");

    const series = variantView
        ? [{ name: nameOf(selected), data: byTime(own) }]
        : !hasVariants
            ? [{ name: "Price", data: byTime(history.prices) }]
            : [...new Set(history.prices.map((p) => p.skuId ?? null))]
                .sort((a, b) => (a === selected ? -1 : b === selected ? 1 : 0))
                .map((skuId) => ({ name: nameOf(skuId), data: byTime(history.prices.filter((p) => (p.skuId ?? null) === skuId)) }));

    const note = hasVariants && !loading && (variantView
        ? <>Showing <b>{nameOf(selected)}</b>. <button className="underline cursor-pointer" onClick={() => setShowAll(true)}>Show all variants</button></>
        : own.length > 0
            ? <>Showing all variants. <button className="underline cursor-pointer" onClick={() => setShowAll(false)}>Show only {nameOf(selected)}</button></>
            : <>No history for {nameOf(selected)} yet. Showing all variants.</>);

    const layout = {
        tab1: {
            title: "Price History",
            content: <>
                {note && <p className="px-3 pt-1 text-xs">{note}</p>}
                <PriceChart series={series} loading={loading} />
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