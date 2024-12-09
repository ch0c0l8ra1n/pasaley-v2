import { useEffect, useRef, useState } from "react";
import ReactDOMServer from "react-dom/server";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import { makeOptions } from "./chartConfig";

import './price-chart.css';
import {Spinner} from './Spinner';

Highcharts.AST.allowedAttributes.push('viewBox');

const SpinnerHTML = ReactDOMServer.renderToStaticMarkup(<Spinner/>)


type PriceChartProps = {
    data: Array<Array<number>>;
    loading: boolean;
}

const PriceChart = ({data, loading} : PriceChartProps) => {
    const internalChart = useRef<Highcharts.Chart | null>(null);
    
    const [options, setOptions] = useState(makeOptions(data));

    useEffect(() => {
        setOptions(makeOptions(data));
    }, [data])

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