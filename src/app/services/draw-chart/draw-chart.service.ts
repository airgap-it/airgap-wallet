import { TimeInterval } from '@airgap/coinlib-core'
import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'

@Injectable()
export class DrawChartService {
  public chartSubject: BehaviorSubject<TimeInterval> = new BehaviorSubject<TimeInterval>(TimeInterval.HOURS)

  public getChartObservable(): Observable<TimeInterval> {
    return this.chartSubject.asObservable()
  }

  public drawChart(interval?: TimeInterval): void {
    this.chartSubject.next(interval || TimeInterval.HOURS)
  }
}
