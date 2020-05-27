import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertController, LoadingController, Platform, ToastController } from '@ionic/angular'
import { getProtocolByIdentifier, IACMessageDefinitionObject, ICoinProtocol, SignedTransaction } from 'airgap-coin-lib'

import { PushBackendProvider } from '../../services/push-backend/push-backend'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../../services/storage/storage'
import { BrowserService } from 'src/app/services/browser/browser.service'

const SECOND: number = 1000

const TOAST_DURATION: number = SECOND * 3
const TOAST_ERROR_DURATION: number = SECOND * 5
const TIMEOUT_TRANSACTION_QUEUED: number = SECOND * 20

@Component({
  selector: 'page-transaction-confirm',
  templateUrl: 'transaction-confirm.html',
  styleUrls: ['./transaction-confirm.scss']
})
export class TransactionConfirmPage {
  public signedTransactionsSync: IACMessageDefinitionObject[]
  private signedTxs: string[]
  public protocols: ICoinProtocol[]

  constructor(
    public loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly alertCtrl: AlertController,
    private readonly platform: Platform,
    private readonly storageProvider: StorageProvider,
    private readonly pushBackendProvider: PushBackendProvider,
    private readonly browserService: BrowserService
  ) {}

  public dismiss(): void {
    this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async ionViewWillEnter() {
    await this.platform.ready()
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.signedTransactionsSync = info.signedTransactionsSync
    }

    // TODO: Multi messages
    // tslint:disable-next-line:no-unnecessary-type-assertion
    this.signedTxs = this.signedTransactionsSync.map(signedTx => (signedTx.payload as SignedTransaction).transaction)
    this.protocols = this.signedTransactionsSync.map(signedTx => getProtocolByIdentifier(signedTx.protocol))
  }

  public async broadcastTransaction() {
    const loading = await this.loadingCtrl.create({
      message: 'Broadcasting...'
    })

    loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    const interval = setTimeout(async () => {
      loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      const toast: HTMLIonToastElement = await this.toastCtrl.create({
        duration: TOAST_DURATION,
        message: 'Transaction queued. It might take some time until your TX shows up!',
        buttons: [
          {
            text: 'Ok',
            role: 'cancel'
          }
        ],
        position: 'bottom'
      })
      toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))

      this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }, TIMEOUT_TRANSACTION_QUEUED)

    this.protocols.forEach((protocol, index) => {
      protocol
        .broadcastTransaction(this.signedTxs[index])
        .then(async txId => {
          console.log('transaction hash', txId)
          if (interval) {
            clearInterval(interval)
          }
          // TODO: Remove once we introduce pending transaction handling
          // TODO: Multi messages
          // tslint:disable-next-line:no-unnecessary-type-assertion
          const signedTxWrapper = this.signedTransactionsSync[index].payload as SignedTransaction
          const lastTx: {
            protocol: string
            accountIdentifier: string
            date: number
          } = {
            protocol: this.signedTransactionsSync[index].protocol,
            accountIdentifier: signedTxWrapper.accountIdentifier,
            date: new Date().getTime()
          }
          this.storageProvider.set(SettingsKey.LAST_TX_BROADCAST, lastTx).catch(handleErrorSentry(ErrorCategory.STORAGE))

          loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

          this.showTransactionSuccessfulAlert(protocol, txId)

          // POST TX TO BACKEND
          const signed = (await protocol.getTransactionDetailsFromSigned(this.signedTransactionsSync[index]
            .payload as SignedTransaction))[0] as any
          // necessary for the transaction backend
          signed.amount = signed.amount.toString()
          signed.fee = signed.fee.toString()
          signed.signedTx = this.signedTxs[index]
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
            ;(protocol.getTransactionDetailsFromSigned(this.signedTransactionsSync[index].payload as SignedTransaction) as any).then(
              signed => {
                if (signed.hash) {
                  this.showTransactionSuccessfulAlert(protocol, signed.hash)
                  // POST TX TO BACKEND
                  // necessary for the transaction backend
                  signed.amount = signed.amount.toString()
                  signed.fee = signed.fee.toString()
                  signed.signedTx = this.signedTxs[index]
                  this.pushBackendProvider.postPendingTx(signed) // Don't await
                  // END POST TX TO BACKEND
                } else {
                  handleErrorSentry(ErrorCategory.COINLIB)('No transaction hash present in signed ETH transaction')
                }
              }
            )
          } else {
            this.toastCtrl
              .create({
                duration: TOAST_ERROR_DURATION,
                message: 'Transaction broadcasting failed: ' + error,
                buttons: [
                  {
                    text: 'Ok',
                    role: 'cancel'
                  }
                ],
                position: 'bottom'
              })
              .then(toast => {
                toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
              })
              .catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
          }
          this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        })
    })
  }

  private async showTransactionSuccessfulAlert(protocol: ICoinProtocol, transactionHash: string): Promise<void> {
    const blockexplorer: string = await protocol.getBlockExplorerLinkForTxId(transactionHash)
    this.alertCtrl
      .create({
        header: 'Transaction broadcasted!',
        message: 'Your transaction has been successfully broadcasted',
        buttons: [
          {
            text: 'Open Blockexplorer',
            handler: (): void => {
              this.browserService.openUrl(blockexplorer)

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
}
