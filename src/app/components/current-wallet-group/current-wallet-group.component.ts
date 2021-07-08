import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { Component } from '@angular/core'
import { Observable } from 'rxjs'
import { first, map } from 'rxjs/operators'

import { AirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'
import { AccountProvider, ActiveWalletGroup } from '../../services/account/account.provider'

@Component({
  selector: 'current-wallet-group',
  templateUrl: './current-wallet-group.component.html',
  styleUrls: ['./current-wallet-group.component.scss']
})
export class CurrentWalletGroupComponent {
  public readonly groups$: Observable<ActiveWalletGroup[]>
  public readonly currentGroup$: Observable<ActiveWalletGroup>

  constructor(private readonly accountProvider: AccountProvider) {
    this.groups$ = this.accountProvider.getWalletGroupsObservable().pipe(
      map((groups: AirGapMarketWalletGroup[]) => {
        const activeGroups: AirGapMarketWalletGroup[] = groups.filter(
          (group: AirGapMarketWalletGroup) => group.status === AirGapWalletStatus.ACTIVE
        )

        return activeGroups.length > 1 ? ['all', ...activeGroups] : activeGroups
      })
    )
    this.currentGroup$ = this.accountProvider.getActiveWalletGroupObservable()
  }

  public async onChange(event: CustomEvent & { detail: { value: ActiveWalletGroup } }): Promise<void> {
    const changedGroup: ActiveWalletGroup = event.detail.value
    const currentGroup: ActiveWalletGroup = await this.currentGroup$.pipe(first()).toPromise()

    if (!this.accountProvider.isSameGroup(changedGroup, currentGroup)) {
      this.accountProvider.setActiveGroup(changedGroup)
    }
  }
}
