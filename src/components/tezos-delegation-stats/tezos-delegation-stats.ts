import { Input, Component } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { DelegationInfo, TezosKtProtocol } from 'airgap-coin-lib/dist/protocols/tezos/kt/TezosKtProtocol'
import { handleErrorIgnore } from '../../providers/sentry-error-handler/sentry-error-handler'

const ktProtocol = new TezosKtProtocol()

@Component({
  selector: 'tezos-delegation-stats',
  templateUrl: 'tezos-delegation-stats.html'
})
export class TezosDelegationStats {
  @Input()
  wallet: AirGapMarketWallet

  delegationRewards: DelegationInfo[] | void

  async ngOnChanges() {
    if (this.wallet) {
      this.delegationRewards = await ktProtocol.delegationInfo(this.wallet.receivingPublicAddress).catch(handleErrorIgnore)
    }
  }
}
