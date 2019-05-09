import { Component, Input } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { DelegationRewardInfo, TezosKtProtocol } from 'airgap-coin-lib'

import { handleErrorIgnore } from '../../services/sentry-error-handler/sentry-error-handler'

const ktProtocol = new TezosKtProtocol()

@Component({
  selector: 'tezos-delegation-stats',
  templateUrl: 'tezos-delegation-stats.html'
})
export class TezosDelegationStats {
  @Input()
  wallet: AirGapMarketWallet

  delegationRewards: DelegationRewardInfo[] | void

  async ngOnChanges() {
    if (this.wallet) {
      this.delegationRewards = await ktProtocol.delegationInfo(this.wallet.receivingPublicAddress).catch(handleErrorIgnore)
    }
  }
}
