import PriceChart from '@/components/chart/price-chart';
import { useEffect, useState } from 'react';
import ChartAppLayout from '@/components/chart-app-layout';
import API from '@/lib/api';
import AlertsTab from '@/components/alerts-tab';
import { isExtension } from '@/lib/utils';
const api = new API();

interface ChartAppProps {
    productId: string;
    hostCountry: string;
}

// Save the original requestAnimationFrame
const originalRAF = window.requestAnimationFrame;

// Bind requestAnimationFrame to the correct window object
window.requestAnimationFrame = originalRAF.bind(window);

const ChartApp = ({productId,hostCountry}: ChartAppProps) => {

    const [data, setData] = useState<Array<Array<number>>>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => { (async () => {
        const prices = await api.getPriceHistory(productId, hostCountry);
        // .map((price: { time: string; price: number; }) => [new Date(price.time).getTime(), price.price])
        // .sort((a: number[], b: number[]) => a[0] - b[0]);

        const sortedPrices = prices
        .map((price: { time: string; price: number; }) => [new Date(price.time).getTime(), price.price])
        .sort((a: number[], b: number[]) => a[0] - b[0]);

        setData(sortedPrices);
        setLoading(false);
    })()}, [])

    const layout = {
        tab1: {
            title: "Price History",
            content: <PriceChart data={data} loading={loading} />
        },
        tab2: {
            title: "Alerts",
            content: isExtension() ? <AlertsTab productId={productId} hostCountry={hostCountry} /> : <div>Coming soon!</div>
        }
    }
    
    return (
        <ChartAppLayout layout={layout}/>
    );
}

export default ChartApp;