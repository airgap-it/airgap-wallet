import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { TimeUnit } from 'airgap-coin-lib/dist/wallet/AirGapMarketWallet'

@Injectable()
export class DrawChartService {
  public currentChart = TimeUnit.Minutes
  public chartSubject = new BehaviorSubject(TimeUnit.Minutes)

  getChartObservable() {
    return this.chartSubject.asObservable()
  }

  drawChart() {
    switch (this.currentChart) {
      case TimeUnit.Minutes:
        this.chartSubject.next(TimeUnit.Minutes)
        break
      case TimeUnit.Hours:
        this.chartSubject.next(TimeUnit.Hours)
        break
      case TimeUnit.Days:
        this.chartSubject.next(TimeUnit.Days)
        break
    }
  }
}
