import { AfterViewInit, Component, Input, OnDestroy, ViewChild } from '@angular/core'
import { TimeUnit } from 'airgap-coin-lib/dist/wallet/AirGapMarketWallet'
import { BaseChartDirective } from 'ng2-charts'
import { Subscription } from 'rxjs'

import { DrawChartService } from './../../services/draw-chart/draw-chart.service'
import { MarketDataService } from './../../services/market-data/market-data.service'

@Component({
  selector: 'chart',
  templateUrl: 'chart.component.html'
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  @Input()
  public total: number

  @ViewChild('baseChart', { static: true }) public chart?: BaseChartDirective

  public currentChart: TimeUnit = TimeUnit.Minutes
  public chartType: string = 'line'
  public chartLabels: string[] = []
  public percentageChange: number
  public chartOptions: any = {}
  public chartColors: {}[] = []

  public chartDatasets: { data: number[]; label: string }[] = [{ data: [], label: 'Price' }]

  public rawData: number[] = []

  private readonly subscription: Subscription

  constructor(private readonly drawChartProvider: DrawChartService, private readonly marketDataProvider: MarketDataService) {
    this.chartOptions = {
      layout: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0
        }
      },
      animation: {
        duration: 1250 // general animation time
      },
      hover: {
        animationDuration: 250 // duration of animations when hovering an item
      },
      responsiveAnimationDuration: 0, // animation duration after a resize
      legend: {
        display: false
      },
      responsive: true,
      scaleFontColor: 'white',
      type: 'line',
      scales: {
        yAxes: [
          {
            display: false,
            gridLines: {
              display: false
            }
          }
        ],
        xAxes: [
          {
            display: false,
            gridLines: {
              display: false
            }
          }
        ]
      },
      elements: {
        point: {
          radius: 1
        },
        line: {
          tension: 0 // disables bezier curves
        }
      },
      annotation: {
        annotations: [
          {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x-axis-0',
            borderColor: 'orange',
            borderWidth: 2,
            label: {
              enabled: true,
              fontColor: 'orange',
              content: 'LineAnno'
            }
          }
        ]
      }
    }

    this.subscription = this.drawChartProvider.getChartObservable().subscribe(async data => {
      await this.drawChart(data)
    })
  }

  public async drawChart(timeInterval: TimeUnit): Promise<void> {
    this.chartLabels = []
    this.chartDatasets = [{ data: [], label: 'Price' }]

    this.currentChart = timeInterval

    this.rawData = await this.marketDataProvider.fetchAllValues(this.currentChart)
    this.chartDatasets[0].data = this.rawData

    for (let i = 0; i < this.rawData.length; i++) {
      // x-axis labeling
      this.chartLabels.push(' ')
    }

    this.percentageChange = await this.displayPercentageChange(this.rawData)
  }

  public setLabel24h(): void {
    this.currentChart = TimeUnit.Minutes
  }

  public async displayPercentageChange(rawData: number[]): Promise<number> {
    const firstValue: number = rawData.find(value => value > 0)
    if (firstValue !== undefined) {
      const lastValue: number = rawData.slice(-1)[0]
      const percentageChange: number = ((lastValue - firstValue) / firstValue) * 100

      return Number(parseFloat(String(Math.round(percentageChange * 100) / 100)).toFixed(2))
    }

    return 0
  }

  public ngAfterViewInit(): void {
    this.chartDatasets = [{ data: [], label: 'Price' }]
    this.chartLabels = []

    if (this.chart) {
      const ctx: CanvasRenderingContext2D = (this.chart.ctx as any) as CanvasRenderingContext2D

      const color1: string = '26E8CD' // rgb(122, 141, 169)

      const gradientStroke1: CanvasGradient = ctx.createLinearGradient(0, 10, 0, 0)
      gradientStroke1.addColorStop(0, `#${color1}`)

      const gradientFill1: CanvasGradient = ctx.createLinearGradient(0, 100, 0, 0)
      gradientFill1.addColorStop(1, 'rgba(38,232,205,0.34)')
      gradientFill1.addColorStop(0, 'rgba(38,232,205,0.04) ')

      this.chartColors[0] = {
        backgroundColor: gradientFill1,
        borderColor: gradientStroke1,
        pointBackgroundColor: gradientStroke1,
        pointBorderColor: gradientStroke1,
        pointHoverBackgroundColor: gradientStroke1,
        pointHoverBorderColor: gradientStroke1
      }
    }
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }
}
