import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { Component } from '@angular/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
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
    this.groups$ = this.accountProvider
      .getWalletGroupsObservable()
      .pipe(
        map((groups: AirGapMarketWalletGroup[]) =>
          groups.filter((group: AirGapMarketWalletGroup) => group.status === AirGapWalletStatus.ACTIVE)
        )
      )
    this.currentGroup$ = this.accountProvider.getActiveWalletGroupObservable()
  }

  public onChange(group: AirGapMarketWalletGroup): void {
    this.accountProvider.setActiveGroup(group.id)
  }
}
