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

export const makeOptions = (data: Array<Array<number>>) => ({
    ...ChartConfig,
    rangeSelector: {
        ...ChartConfig.rangeSelector,
        enabled: data.length > 0
    },
    series: [{
        ...(ChartConfig.series?.[0] ?? {}),
        data: data.length > 0 ? data : dummyData
    }]

});