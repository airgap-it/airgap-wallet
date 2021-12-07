import { AirGapMarketWallet, AirGapWalletStatus, NetworkType, SubProtocolSymbols, TimeInterval } from '@airgap/coinlib-core'
import { AfterViewInit, Component, Input, OnDestroy, ViewChild } from '@angular/core'
import * as moment from 'moment'
import { BaseChartDirective } from 'ng2-charts'
import { combineLatest, Subscription } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'

import { AccountProvider } from '../../services/account/account.provider'

import { DrawChartService } from './../../services/draw-chart/draw-chart.service'
import { MarketDataService, ValueAtTimestamp } from './../../services/market-data/market-data.service'

@Component({
  selector: 'chart',
  templateUrl: 'chart.component.html'
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  @Input()
  public total: number

  @ViewChild('baseChart', { static: true }) public chart?: BaseChartDirective

  public readonly timeInterval: typeof TimeInterval = TimeInterval

  public currentTimeInterval: TimeInterval | undefined = undefined
  public chartType: string = 'line'
  public chartLabels: string[] = []
  public percentageChange: number
  public chartOptions: any = {}
  public chartColors: {}[] = []

  public chartDatasets: { data: number[]; label: string }[] = [{ data: [], label: 'Price' }]

  private subscription: Subscription
  private activeWallets: AirGapMarketWallet[]

  constructor(
    private readonly drawChartProvider: DrawChartService,
    private readonly marketDataProvider: MarketDataService,
    private readonly accountProvider: AccountProvider
  ) {}

  public ngOnInit(): void {
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
      tooltips: {
        mode: 'x-axis',
        intersect: false,
        displayColors: false, // removes color box and label

        callbacks: {
          title: function (data) {
            return moment.unix(data[0].label).format('DD.MM.YYYY')
          },
          label: function (data): string {
            if (Number(data.value) % 1 !== 0) {
              let value = parseFloat(data.value).toFixed(2)
              return `$${value}`
            } else {
              return data.value
            }
          }
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
    this.subscription = combineLatest([this.drawChartProvider.getChartObservable(), this.accountProvider.wallets$.asObservable()])
      .pipe(distinctUntilChanged())
      .subscribe(async ([data, wallets]) => {
        this.activeWallets =
          wallets.filter(
            (wallet) =>
              wallet.status === AirGapWalletStatus.ACTIVE &&
              wallet.protocol.identifier !== SubProtocolSymbols.XTZ_USD &&
              wallet.protocol.options.network.type === NetworkType.MAINNET
          ) ?? []
        this.drawChart(data)
      })
  }

  public async drawChart(timeInterval: TimeInterval): Promise<void> {
    this.chartLabels = []
    this.chartDatasets = [{ data: [], label: '$' }]

    this.currentTimeInterval = timeInterval

    this.marketDataProvider.fetchAllValues(this.currentTimeInterval, this.activeWallets).then(async (rawData) => {
      this.chartDatasets[0].data = rawData.map((obj: ValueAtTimestamp) => obj.usdValue)

      for (const value of rawData) {
        // x-axis labeling
        this.chartLabels.push(value.timestamp.toString())
      }

      this.percentageChange = this.displayPercentageChange(rawData.map((obj: ValueAtTimestamp) => obj.usdValue))
    })
  }

  public setLabel24h(): void {
    this.currentTimeInterval = TimeInterval.HOURS
  }

  public displayPercentageChange(rawData: number[]): number {
    const firstValue: number = rawData.find((value) => value > 0)
    if (firstValue !== undefined) {
      const lastValue: number = rawData.slice(-1)[0]
      const percentageChange: number = ((lastValue - firstValue) / firstValue) * 100

      return Number(parseFloat(String(Math.round(percentageChange * 100) / 100)).toFixed(2))
    }

    return 0
  }

  public ngAfterViewInit(): void {
    this.chartDatasets = [{ data: [], label: '$' }]
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
