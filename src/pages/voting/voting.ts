import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'
import BigNumber from 'bignumber.js'
import { InteractionSelectionPage } from '../interaction-selection/interaction-selection'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../providers/operations/operations'
import { RemoteConfigProvider, AeFirstVote } from '../../providers/remote-config/remote-config'

declare let cordova

@Component({
  selector: 'page-voting',
  templateUrl: 'voting.html'
})
export class VotingPage {
  public oldVotePercentage: number
  public config: AeFirstVote
  public wallet: AirGapMarketWallet

  public votePercentage: number = 10
  public votingAddress: string = 'ak_11111111111111111111111111111111273Yts'

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private operationsProvider: OperationsProvider,
    private remoteConfigProvider: RemoteConfigProvider,
    private platform: Platform
  ) {
    this.wallet = this.navParams.get('wallet')
  }

  ngOnInit() {
    this.remoteConfigProvider.aeFirstVote().then(config => (this.config = config))

    this.wallet
      .fetchTransactions(1000, 0)
      .then(txs => {
        const oldVote = txs.find(tx => !!tx.data)
        console.log(oldVote)
        if (oldVote) {
          try {
            console.log(JSON.parse(oldVote.data))
            this.oldVotePercentage = JSON.parse(oldVote.data).vote.option
          } catch (error) {
            console.log(error)
          }
        }
      })
      .catch(console.log)
  }

  public openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
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
