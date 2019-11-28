import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertController, LoadingController, Platform, ToastController } from '@ionic/angular'
import {
  AirGapMarketWallet,
  getProtocolByIdentifier,
  ICoinProtocol,
  SignedTransaction,
  TezosKtProtocol,
  IACMessageDefinitionObject
} from 'airgap-coin-lib'

import { AccountProvider } from '../../services/account/account.provider'
import { ProtocolSymbols } from '../../services/protocols/protocols'
import { PushBackendProvider } from '../../services/push-backend/push-backend'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../../services/storage/storage'

declare var cordova

const SECOND: number = 1000
const MINUTE: number = SECOND * 60

const TOAST_DURATION: number = SECOND * 3
const TOAST_ERROR_DURATION: number = SECOND * 5
const INTERVAL_KT_REFRESH: number = SECOND * 10
const TIMEOUT_TRANSACTION_QUEUED: number = SECOND * 20
const TIMEOUT_KT_REFRESH_CLEAR: number = MINUTE * 5

@Component({
  selector: 'page-transaction-confirm',
  templateUrl: 'transaction-confirm.html',
  styleUrls: ['./transaction-confirm.scss']
})
export class TransactionConfirmPage {
  public signedTransactionSync: IACMessageDefinitionObject
  private signedTx: string
  public protocol: ICoinProtocol

  constructor(
    public loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly alertCtrl: AlertController,
    private readonly platform: Platform,
    private readonly storageProvider: StorageProvider,
    private readonly accountProvider: AccountProvider,
    private readonly pushBackendProvider: PushBackendProvider
  ) {}

  public dismiss(): void {
    this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async ionViewWillEnter() {
    await this.platform.ready()
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.signedTransactionSync = info.signedTransactionSync
    }

    // TODO: Multi messages
    // tslint:disable-next-line:no-unnecessary-type-assertion
    this.signedTx = (this.signedTransactionSync.payload as SignedTransaction).transaction
    this.protocol = getProtocolByIdentifier(this.signedTransactionSync.protocol)
  }

  public async broadcastTransaction() {
    const loading = await this.loadingCtrl.create({
      message: 'Broadcasting...'
    })

    loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    const interval = setTimeout(() => {
      loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      const toast = this.toastCtrl
        .create({
          duration: TOAST_DURATION,
          message: 'Transaction queued. It might take some time until your TX shows up!',
          showCloseButton: true,
          position: 'bottom'
        })
        .then(toast => {
          toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        })

      this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }, TIMEOUT_TRANSACTION_QUEUED)

    console.log('this.signedTx', this.signedTx)
    this.protocol
      .broadcastTransaction(this.signedTx)
      .then(async txId => {
        console.log('txId', txId)
        if (interval) {
          clearInterval(interval)
        }
        // TODO: Remove once tezos allows delegation from tz1 addresses
        if (this.protocol.identifier === ProtocolSymbols.XTZ) {
          // Add KT accounts after broadcasting an xtz address because it might have generated a new KT address
          const ktInterval = setInterval(async () => {
            const ktProtocol = new TezosKtProtocol()
            const xtzWallets = this.accountProvider.getWalletList().filter(wallet => wallet.protocolIdentifier === ProtocolSymbols.XTZ)
            xtzWallets.forEach(async xtzWallet => {
              const ktAccounts = await ktProtocol.getAddressesFromPublicKey(xtzWallet.publicKey)
              ktAccounts.forEach((_ktAccount, index) => {
                const ktWallet = new AirGapMarketWallet(
                  ProtocolSymbols.XTZ_KT,
                  xtzWallet.publicKey,
                  xtzWallet.isExtendedPublicKey,
                  xtzWallet.derivationPath,
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
          }, INTERVAL_KT_REFRESH)
          setTimeout(() => {
            clearInterval(ktInterval)
          }, TIMEOUT_KT_REFRESH_CLEAR)
        }

        // TODO: Remove once we introduce pending transaction handling
        // TODO: Multi messages
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

        this.showTransactionSuccessfulAlert(txId)

        // POST TX TO BACKEND
        const signed = (
          await this.protocol.getTransactionDetailsFromSigned(this.signedTransactionSync.payload as SignedTransaction)
        )[0] as any
        // necessary for the transaction backend
        signed.amount = signed.amount.toString()
        signed.fee = signed.fee.toString()
        signed.signedTx = this.signedTx
        signed.hash = txId

        console.log('SIGNED TX', signed)
        this.pushBackendProvider.postPendingTx(signed) // Don't await
        // END POST TX TO BACKEND
      })
      .catch(error => {
        if (interval) {
          clearInterval(interval)
        }

        handleErrorSentry(ErrorCategory.COINLIB)(error)

        loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

        // TODO: Remove this special error case once we remove web3 from the coin-lib
        if (error && error.message && error.message.startsWith('Failed to check for transaction receipt')) {
          ;(this.protocol.getTransactionDetailsFromSigned(this.signedTransactionSync.payload as SignedTransaction) as any).then(signed => {
            if (signed.hash) {
              this.showTransactionSuccessfulAlert(signed.hash)
              // POST TX TO BACKEND
              // necessary for the transaction backend
              signed.amount = signed.amount.toString()
              signed.fee = signed.fee.toString()
              signed.signedTx = this.signedTx
              this.pushBackendProvider.postPendingTx(signed) // Don't await
              // END POST TX TO BACKEND
            } else {
              handleErrorSentry(ErrorCategory.COINLIB)('No transaction hash present in signed ETH transaction')
            }
          })
        } else {
          this.toastCtrl
            .create({
              duration: TOAST_ERROR_DURATION,
              message: 'Transaction broadcasting failed: ' + error,
              showCloseButton: true,
              position: 'bottom'
            })
            .then(toast => {
              toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
            })
            .catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
        }
        this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
  }

  private showTransactionSuccessfulAlert(transactionHash: string): void {
    this.alertCtrl
      .create({
        header: 'Transaction broadcasted!',
        message: 'Your transaction has been successfully broadcasted',
        buttons: [
          {
            text: 'Open Blockexplorer',
            handler: (): void => {
              const blockexplorer: string = this.protocol.getBlockExplorerLinkForTxId(transactionHash)
              this.openUrl(blockexplorer)

              this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
            }
          },
          {
            text: 'Ok',
            handler: (): void => {
              this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
            }
          }
        ]
      })
      .then((alert: HTMLIonAlertElement) => {
        alert.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
      .catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  private openUrl(url: string): void {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }
}
