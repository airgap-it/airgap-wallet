import { ProtocolSymbols } from '@airgap/coinlib-core'
import { Component } from '@angular/core'

export interface HealthInfo {
  identifier: ProtocolSymbols
  isUp: boolean
}
@Component({
  selector: 'app-health',
  templateUrl: './health.page.html',
  styleUrls: ['./health.page.scss']
})
export class HealthPage {
  public healthInfo = [
    { identifier: 'btc', isUp: false, balance: 'NaN' },
    { identifier: 'eth', isUp: true, balance: '689497000000000' },
    { identifier: 'ae', isUp: true, balance: '690457355208242900000000' },
    { identifier: 'xtz', isUp: true, balance: '717753446' },
    { identifier: 'grs', isUp: false, balance: 'NaN' },
    { identifier: 'cosmos', isUp: true, balance: '126139941' },
    { identifier: 'kusama', isUp: true, balance: '15206327836081259' },
    { identifier: 'polkadot', isUp: true, balance: '19764201692' }
  ]

  constructor() {}
}
