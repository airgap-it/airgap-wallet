import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import BigNumber from 'bignumber.js'
import { InteractionSelectionPage } from '../interaction-selection/interaction-selection'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../providers/operations/operations'

@Component({
  selector: 'page-voting',
  templateUrl: 'voting.html'
})
export class VotingPage {
  public wallet: AirGapMarketWallet

  public votePercentage: number = 0
  public votingAddress: string = 'ak_11111111111111111111111111111111273Yts'

  constructor(public navCtrl: NavController, public navParams: NavParams, private operationsProvider: OperationsProvider) {
    this.wallet = this.navParams.get('wallet')
  }

  public async vote() {
    try {
      const { airGapTx, serializedTx } = await this.operationsProvider.prepareTransaction(
        this.wallet,
        this.votingAddress,
        new BigNumber(0),
        new BigNumber(17240000000000),
        JSON.stringify({
          vote: { id: 1, option: Math.round(this.votePercentage) }
        })
      )

      this.navCtrl
        .push(InteractionSelectionPage, {
          wallet: this.wallet,
          airGapTx: airGapTx,
          data: 'airgap-vault://?d=' + serializedTx
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      //
    }
  }
}
