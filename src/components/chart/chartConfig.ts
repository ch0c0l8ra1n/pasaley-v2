import { subMonths, subDays } from 'date-fns';
import Highcharts from 'highcharts/highstock';

const today = new Date().getTime();
const tomorrow = subDays(today, -1).getTime();
const oneMonthAgo = subMonths(today, 1).getTime();

const dummyData = [
    [subMonths(today,1).getTime(), 0],
    [today, 0]
];

export const ChartConfig: Highcharts.Options= {
    time: {
        timezoneOffset: new Date().getTimezoneOffset()
    },
    credits: {
        enabled: false
    },
    loading: {
        style: {
            opacity: 100
        }
    },
    chart: {
        zooming: {
            mouseWheel: {
                enabled: false
            }
        },
    },
    rangeSelector: {
        buttons: [{
            type: 'month',
            count: 1,
            text: '1m'
        }, {
            type: 'month',
            count: 3,
            text: '3m'
        }, {
            type: 'month',
            count: 6,
            text: '6m'
        }, {
            type: 'all',
            text: 'All'
        }],
        buttonTheme: {
            fill: "white"
        },
        selected: 0,
        inputEnabled: false
    },
    xAxis: {
        labels: {
            enabled: true
        },
        showEmpty: true,
        max: tomorrow,
        softMin: oneMonthAgo,
        type: 'datetime',
        ordinal: false,
    },
    yAxis: {
        showEmpty: true
    },
    plotOptions: {
        series: {
            dataGrouping: {
                enabled: false
            },
            step:"left",
            lineWidth: 0.5,
            tooltip: {
                valueDecimals: 0
            },
            states: {
                hover: {
                    lineWidth: 1
                }
            },
            color: 'hsl(var(--chart-1))', // Line color,
            
        }
    },
    accessibility: {
        enabled: false
    },
    series: [{
        type: 'area',
        name: 'Price',
        fillColor: {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
                [0, 'rgba(var(--chart-1-rgb),0.3)'], // Start color
                [1, 'rgba(var(--chart-1-rgb),0.1)'] // End color
            ]
        },
    }]
}

// Other variants' lines, after the main one (Highcharts' default palette).
const VARIANT_COLORS = ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'];

// The first series is drawn as the shaded area, any others (other variants) as plain lines.
export const makeOptions = (series: { name: string; data: Array<Array<number>> }[]) => {
    const withData = series.filter((s) => s.data.length > 0);
    return {
        ...ChartConfig,
        rangeSelector: {
            ...ChartConfig.rangeSelector,
            enabled: withData.length > 0
        },
        legend: { enabled: withData.length > 1 },
        series: withData.length === 0
            ? [{ ...(ChartConfig.series?.[0] ?? {}), data: dummyData }]
            : withData.map((s, i) => i === 0
                ? { ...(ChartConfig.series?.[0] ?? {}), name: s.name, data: s.data }
                : { type: 'line', name: s.name, data: s.data, color: VARIANT_COLORS[(i - 1) % VARIANT_COLORS.length] }),
    };
};