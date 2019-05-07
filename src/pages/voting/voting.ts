import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'
import BigNumber from 'bignumber.js'
import { InteractionSelectionPage } from '../interaction-selection/interaction-selection'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../providers/operations/operations'
import { RemoteConfigProvider, AeFirstVote } from '../../providers/remote-config/remote-config'
import { HttpClient } from '@angular/common/http'

declare let cordova

@Component({
  selector: 'page-voting',
  templateUrl: 'voting.html'
})
export class VotingPage {
  public oldVotePercentage: number
  public oldVoteTimestamp: number
  public config: AeFirstVote
  public wallet: AirGapMarketWallet

  public voting: boolean = true

  public votePercentage: number = 10
  public votingAddress: string = 'ak_11111111111111111111111111111111273Yts'

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private operationsProvider: OperationsProvider,
    private remoteConfigProvider: RemoteConfigProvider,
    private platform: Platform,
    private http: HttpClient
  ) {
    this.wallet = this.navParams.get('wallet')
    this.http
      .get<any>(
        `https://mainnet.mdw.aepps.com/middleware/transactions/account/${this.wallet.receivingPublicAddress}/to/${this.votingAddress}`
      )
      .toPromise()
      .then(({ transactions: txs }) => {
        const oldVote = txs.find(tx => !!tx.tx.payload)
        console.log('oldVote', oldVote)
        if (oldVote && oldVote.block_height <= 80541) {
          try {
            console.log(JSON.parse(oldVote.tx.payload))
            this.oldVotePercentage = JSON.parse(oldVote.tx.payload).vote.option
            // Get the time
            /*
            this.http
              .get<any>(`https://roma-net.mdw.aepps.com/v2/generations/height/${oldVote.block_height}`)
              .toPromise()
              .then(({ key_block: keyBlock }) => {
                console.log(keyBlock)
                this.oldVoteTimestamp = keyBlock.time / 1000
              })
              .catch(console.warn)
            */
            this.voting = false
          } catch (error) {
            console.log(error)
          }
        }
      })
      .catch(console.warn)
  }

  async ngOnInit() {
    this.remoteConfigProvider.aeFirstVote().then(config => (this.config = config))
  }

  public openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  public changeVote() {
    this.voting = true
  }

  public async vote() {
    if (!this.voting) {
      return this.navCtrl.pop()
    }
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
