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
        showEmpty: true,
        labels: { align: 'left', x: 4, y: 4 },
    },
    plotOptions: {
        series: {
            dataGrouping: {
                enabled: false
            },
            step:"left",
            lineWidth: 2,
            tooltip: {
                valueDecimals: 0
            },
            states: {
                hover: {
                    lineWidth: 2
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
        threshold: null, // fit the y axis to the prices instead of starting it at 0
        fillColor: {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
                [0, 'rgba(var(--chart-1-rgb),0.3)'], // Start color
                [1, 'rgba(var(--chart-1-rgb),0.1)'] // End color
            ]
        },
    }]
}

// Other variants' lines, after the selected one.
const VARIANT_COLORS = ['#2563eb', '#16a34a', '#9333ea', '#0891b2', '#ca8a04', '#db2777', '#475569'];

// Each line's price on the hovered date: the last one seen by then. Lines are seen at different
// times, so Highcharts' shared tooltip would only find the hovered one.
function allPricesAt(this: Highcharts.Point) {
    const rows = this.series.chart.series
        .filter((s) => s.xAxis === this.series.xAxis) // not the navigator
        .flatMap((s) => {
            const data = (s.options as Highcharts.SeriesLineOptions).data as number[][];
            const seen = data.filter(([time]) => time <= this.x!);
            // Like the line itself: nothing before the first sighting or after the last.
            return seen.length === 0 || this.x! > data[data.length - 1][0] ? [] : [`<span style="color:${s.color}">●</span> ${s.name}: <b>${Highcharts.numberFormat(seen[seen.length - 1][1], 0)}</b>`];
        });
    return [Highcharts.dateFormat('%b %e, %Y', this.x!), ...rows].join('<br/>');
}

type Series = { name: string; data: Array<Array<number>>; selected: boolean };

// The selected variant is drawn as the shaded area, on top; any others as plain lines. With
// several lines, a shared tooltip names them, instead of a legend that would outgrow the chart.
export const makeOptions = (series: Series[]) => {
    const withData = series.filter((s) => s.data.length > 0);
    let color = 0;
    return {
        ...ChartConfig,
        rangeSelector: {
            ...ChartConfig.rangeSelector,
            enabled: withData.length > 0
        },
        legend: { enabled: false },
        tooltip: withData.length > 1 ? { split: false, formatter: allPricesAt } : {},
        series: withData.length === 0
            ? [{ ...(ChartConfig.series?.[0] ?? {}), data: dummyData }]
            : withData.map((s) => s.selected
                ? { ...(ChartConfig.series?.[0] ?? {}), name: s.name, data: s.data, zIndex: 1 }
                : { type: 'line', name: s.name, data: s.data, color: VARIANT_COLORS[color++ % VARIANT_COLORS.length] }),
    };
};
