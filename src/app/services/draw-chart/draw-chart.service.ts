import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

@Injectable()
export class DrawChartService {
  public currentChart = 'last24h'
  public chartSubject = new BehaviorSubject('last24h')

  getChartObservable() {
    return this.chartSubject.asObservable()
  }

  drawChart() {
    switch (this.currentChart) {
      case 'last24h':
        this.chartSubject.next('last24h')
        break
      case 'last7d':
        this.chartSubject.next('last7d')
        break
      case 'allTime':
        this.chartSubject.next('allTime')
        break
    }
  }
}
