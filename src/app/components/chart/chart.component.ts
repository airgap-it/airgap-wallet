import { BaseChartDirective } from 'ng2-charts'
import { MarketDataService } from './../../services/market-data/market-data.service'
import { DrawChartService } from './../../services/draw-chart/draw-chart.service'
import { Component, ViewChild, Input } from '@angular/core'
import { Subscription } from 'rxjs'

/**
 * Generated class for the ChartComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'chart',
  templateUrl: 'chart.component.html'
})
export class ChartComponent {
  @Input()
  public total: number

  @ViewChild('baseChart') public chart?: BaseChartDirective

  public date: Date
  public currentChart = 'last24h'
  public chartType: string = 'line'
  public chartLabels: string[] = []
  public percentageChange: number

  public chartData = {}
  public chartDatasets: { data: number[]; label: string }[] = [{ data: [], label: 'Price' }]
  // public historicData$: Observable<MarketDataSample[]>
  public subscription: Subscription
  public rawData: number[] = []
  chartSubjectSubscription: Subscription

  constructor(private readonly drawChartProvider: DrawChartService, private readonly marketDataProvider: MarketDataService) {
    this.chartSubjectSubscription = this.drawChartProvider.getChartObservable().subscribe(data => {
      this.drawChart(data)
    })
  }

  public chartOptions = {}

  public chartColors: {}[] = []

  public lineChartType: string = 'line'

  public async drawChart(timeInterval: string) {
    this.chartData = {}
    this.chartLabels = []
    this.chartDatasets = [{ data: [], label: 'Price' }]

    this.currentChart = timeInterval

    let myOptions = {}

    this.rawData = await this.marketDataProvider.fetchAllValues(this.currentChart)
    this.chartDatasets[0].data = this.rawData

    for (let i = 0; i < this.rawData.length; i++) {
      // x-axis labeling
      this.chartLabels.push(' ')
    }
    myOptions = {
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

    this.chartOptions = myOptions
    this.percentageChange = await this.displayPercentageChange(this.rawData)
  }

  public setLabel24h() {
    this.currentChart = 'last24h'
  }

  async displayPercentageChange(rawData: any) {
    let firstValue = rawData.find(value => value > 0)
    if (firstValue !== undefined) {
      let lastValue = rawData.slice(-1)[0]
      let percentageChange = ((lastValue - firstValue) / firstValue) * 100
      return Number(parseFloat(String(Math.round(percentageChange * 100) / 100)).toFixed(2))
    }
    return 0
  }

  public ngAfterViewInit() {
    this.chartDatasets = [{ data: [], label: 'Price' }]
    this.chartLabels = []

    if (this.chart) {
      const ctx: CanvasRenderingContext2D = (this.chart.ctx as any) as CanvasRenderingContext2D

      const color1 = '26E8CD' // rgb(122, 141, 169)

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

  public ngOnDestroy() {
    this.chartSubjectSubscription.unsubscribe()
  }
}
