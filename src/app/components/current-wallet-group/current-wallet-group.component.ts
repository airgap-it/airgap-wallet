import { Component } from '@angular/core'
import { Observable } from 'rxjs'
import { AirGapMarketWalletGroup } from 'src/app/models/AirGapMarketWalletGroup'

import { AccountProvider } from '../../services/account/account.provider'

@Component({
  selector: 'current-wallet-group',
  templateUrl: './current-wallet-group.component.html',
  styleUrls: ['./current-wallet-group.component.scss']
})
export class CurrentWalletGroupComponent {
  public readonly groups$: Observable<AirGapMarketWalletGroup[]>
  public readonly currentGroup$: Observable<AirGapMarketWalletGroup>

  constructor(private readonly accountProvider: AccountProvider) {
    this.groups$ = this.accountProvider.getWalletGroupsObservable()
    this.currentGroup$ = this.accountProvider.getActiveWalletGroupObservable()
  }

  public onChange(group: AirGapMarketWalletGroup): void {
    this.accountProvider.setActiveGroup(group.id)
  }
}
