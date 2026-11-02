import { useEffect, useRef } from "react";
import ReactDOMServer from "react-dom/server";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import { makeOptions } from "./chartConfig";

import './price-chart.css';
import {Spinner} from './Spinner';

Highcharts.AST.allowedAttributes.push('viewBox');

const SpinnerHTML = ReactDOMServer.renderToStaticMarkup(<Spinner/>)


export type PriceSeries = { name: string; data: Array<[number, number]>; selected: boolean };

type PriceChartProps = {
    series: PriceSeries[];
    loading: boolean;
}

const PriceChart = ({series, loading} : PriceChartProps) => {
    const internalChart = useRef<Highcharts.Chart | null>(null);
    
    const options = makeOptions(series);

    useEffect(() => {
        if (!internalChart.current) return;

        if (loading) 
            internalChart.current.showLoading(SpinnerHTML);
        else
            internalChart.current.hideLoading();

    }, [loading]);

    return (
        <HighchartsReact
        highcharts={Highcharts}
        constructorType='stockChart'
        options={options}
        callback={(chart: Highcharts.Chart) => {
            internalChart.current = chart;
        }}>

        </HighchartsReact>
    )
}

export default PriceChart;