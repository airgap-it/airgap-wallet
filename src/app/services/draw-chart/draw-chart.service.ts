import { Injectable } from '@angular/core'
import { TimeUnit } from '@airgap/coinlib-core/wallet/AirGapMarketWallet'
import { BehaviorSubject, Observable } from 'rxjs'

@Injectable()
export class DrawChartService {
  public chartSubject: BehaviorSubject<TimeUnit> = new BehaviorSubject<TimeUnit>(TimeUnit.Minutes)

  public getChartObservable(): Observable<TimeUnit> {
    return this.chartSubject.asObservable()
  }

  public drawChart(interval?: TimeUnit): void {
    this.chartSubject.next(interval || TimeUnit.Minutes)
  }
}
