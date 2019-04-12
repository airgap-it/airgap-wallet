import { Component } from '@angular/core'
import { LoadingController, NavController, NavParams, ToastController, AlertController, Platform } from 'ionic-angular'

import {
  getProtocolByIdentifier,
  DeserializedSyncProtocol,
  SignedTransaction,
  ICoinProtocol,
  TezosKtProtocol,
  AirGapMarketWallet
} from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { StorageProvider, SettingsKey } from '../../providers/storage/storage'
import { OperationsProvider } from 'src/providers/operations/operations'
import { AccountProvider } from 'src/providers/account/account.provider'

declare var cordova: any

@Component({
  selector: 'page-transaction-confirm',
  templateUrl: 'transaction-confirm.html'
})
export class TransactionConfirmPage {
  signedTransactionSync: DeserializedSyncProtocol
  private signedTx: string
  public protocol: ICoinProtocol

  constructor(
    public loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    public navController: NavController,
    public navParams: NavParams,
    private alertCtrl: AlertController,
    private platform: Platform,
    private storageProvider: StorageProvider,
    private accountProvider: AccountProvider
  ) {}

  dismiss() {
    this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  async ionViewWillEnter() {
    await this.platform.ready()
    this.signedTransactionSync = this.navParams.get('signedTransactionSync')
    // tslint:disable-next-line:no-unnecessary-type-assertion
    this.signedTx = (this.signedTransactionSync.payload as SignedTransaction).transaction
    this.protocol = getProtocolByIdentifier(this.signedTransactionSync.protocol)
  }

  broadcastTransaction() {
    let loading = this.loadingCtrl.create({
      content: 'Broadcasting...'
    })

    loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    let blockexplorer = '' // TODO: Move to coinlib
    if (this.protocol.identifier.startsWith('btc')) {
      blockexplorer = 'https://live.blockcypher.com/btc/tx/{{txId}}/'
    } else if (this.protocol.identifier.startsWith('eth')) {
      blockexplorer = 'https://etherscan.io/tx/{{txId}}'
    } else if (this.protocol.identifier.startsWith('ae')) {
      blockexplorer = 'https://explorer.aepps.com/#/tx/{{txId}}'
    } else if (this.protocol.identifier.startsWith('xtz')) {
      blockexplorer = 'https://tzscan.io/{{txId}}'
    }

    let interval = setTimeout(() => {
      loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      let toast = this.toastCtrl.create({
        duration: 3000,
        message: 'Transaction queued. It might take some time until your TX shows up!',
        showCloseButton: true,
        position: 'bottom'
      })
      toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }, 20 * 1000)

    this.protocol
      .broadcastTransaction(this.signedTx)
      .then(txId => {
        if (interval) {
          clearInterval(interval)
        }
        // TODO: Remove once tezos allows delegation from tz1 addresses
        if (this.protocol.identifier === 'xtz') {
          // Add KT accounts after broadcasting an xtz address because it might have generated a new KT address
          const ktInterval = setInterval(async () => {
            const protocol = new TezosKtProtocol()
            const wallets = this.accountProvider.getWalletList().filter(wallet => wallet.protocolIdentifier === 'xtz')
            wallets.forEach(async wallet => {
              const ktAccounts = await protocol.getAddressesFromPublicKey(wallet.publicKey)
              ktAccounts.forEach((_ktAccount, index) => {
                const ktWallet = new AirGapMarketWallet(
                  'xtz_kt',
                  wallet.publicKey,
                  wallet.isExtendedPublicKey,
                  wallet.derivationPath,
                  index
                )
                const exists = this.accountProvider.walletExists(ktWallet)
                if (!exists) {
                  ktWallet.addresses = ktAccounts
                  ktWallet.synchronize().catch(handleErrorSentry(ErrorCategory.COINLIB))
                  this.accountProvider.addWallet(ktWallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
                }
              })
            })
          }, 10 * 1000)
          setTimeout(() => {
            clearInterval(ktInterval)
          }, 5 * 60 * 1000)
        }

        // TODO: Remove once we introduce pending transaction handling
        // tslint:disable-next-line:no-unnecessary-type-assertion
        const signedTxWrapper = this.signedTransactionSync.payload as SignedTransaction
        const lastTx: {
          protocol: string
          accountIdentifier: string
          date: number
        } = {
          protocol: this.signedTransactionSync.protocol,
          accountIdentifier: signedTxWrapper.accountIdentifier,
          date: new Date().getTime()
        }
        this.storageProvider.set(SettingsKey.LAST_TX_BROADCAST, lastTx).catch(handleErrorSentry(ErrorCategory.STORAGE))

        loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        let alert = this.alertCtrl.create({
          title: 'Transaction broadcasted!',
          message: 'Your transaction has been successfully broadcasted',
          buttons: [
            {
              text: 'Open Blockexplorer',
              handler: () => {
                if (blockexplorer) {
                  this.openUrl(blockexplorer.replace('{{txId}}', txId))
                } else {
                  let toast = this.toastCtrl.create({
                    duration: 3000,
                    message: 'Unable to open blockexplorer',
                    showCloseButton: true,
                    position: 'bottom'
                  })
                  toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
                }
                this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
              }
            },
            {
              text: 'Ok',
              handler: () => {
                this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
              }
            }
          ]
        })
        alert.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
      .catch(error => {
        if (interval) {
          clearInterval(interval)
        }

        handleErrorSentry(ErrorCategory.COINLIB)(error)

        loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

        let toast = this.toastCtrl.create({
          duration: 5000,
          message: 'Transaction broadcasting failed: ' + error,
          showCloseButton: true,
          position: 'bottom'
        })
        toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }
}
