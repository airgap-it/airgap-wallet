import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import {
  AirGapMarketWallet,
  ICoinProtocol,
  getProtocolByIdentifier,
  TezosKtProtocol,
  SyncProtocolUtils,
  EncodedType
} from 'airgap-coin-lib'
import { AccountProvider } from '../../providers/account/account.provider'
import { SubAccountProvider } from '../../providers/account/sub-account.provider'
import { InteractionSelectionPage } from '../interaction-selection/interaction-selection'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-sub-account-select',
  templateUrl: 'sub-account-select.html'
})
export class SubAccountSelectPage {
  private wallet: AirGapMarketWallet
  private protocolIdentifier: string
  public protocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private accountProvider: AccountProvider,
    private subAccountProvider: SubAccountProvider
  ) {
    this.subWallets = []
    this.wallet = this.navParams.get('wallet')

    this.subAccountProvider.wallets.subscribe(subWallets => {
      this.subWallets = subWallets.filter(subWallet => subWallet.publicKey === this.wallet.publicKey)
    })
  }

  async delegate() {
    console.log(this.wallet)
    const protocol = new TezosKtProtocol()
    const delegateTx = await protocol.delegate(this.wallet.publicKey, 'tz1eEnQhbwf6trb8Q8mPb2RaPkNk2rN7BKi8')

    /*
      console.log(
        protocol.getTransactionDetails({
          publicKey: this.wallet.publicKey,
          transaction: originateTx,
          callback: 'airgap-wallet://?d='
        })
      )
  */
    const syncProtocol = new SyncProtocolUtils()
    const serializedTx = await syncProtocol.serialize({
      version: 1,
      protocol: this.wallet.coinProtocol.identifier,
      type: EncodedType.UNSIGNED_TRANSACTION,
      payload: {
        publicKey: this.wallet.publicKey,
        transaction: delegateTx,
        callback: 'airgap-wallet://?d='
      }
    })

    this.navCtrl
      .push(InteractionSelectionPage, {
        wallet: this.wallet,
        airGapTx: delegateTx,
        data: 'airgap-vault://?d=' + serializedTx
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    console.log('originate', delegateTx)
  }
}
