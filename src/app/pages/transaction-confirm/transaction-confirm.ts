import { BeaconResponseInputMessage } from '@airgap/beacon-sdk'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertController, LoadingController, Platform, ToastController } from '@ionic/angular'
import { getProtocolByIdentifier, IACMessageDefinitionObject, ICoinProtocol, SignedTransaction } from 'airgap-coin-lib'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { BrowserService } from 'src/app/services/browser/browser.service'

import { BeaconService } from '../../services/beacon/beacon.service'
import { PushBackendProvider } from '../../services/push-backend/push-backend'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../../services/storage/storage'

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

  public txInfos: [string, ICoinProtocol, (hash: string) => BeaconResponseInputMessage][] = []
  public protocols: ICoinProtocol[] = []

  constructor(
    private readonly loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly alertCtrl: AlertController,
    private readonly platform: Platform,
    private readonly storageProvider: StorageProvider,
    private readonly beaconService: BeaconService,
    private readonly pushBackendProvider: PushBackendProvider,
    private readonly browserService: BrowserService,
    private readonly accountService: AccountProvider
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
    this.signedTransactionsSync.forEach(async signedTx => {
      const protocol = getProtocolByIdentifier(signedTx.protocol)

      const wallet = this.accountService.walletBySerializerAccountIdentifier(
        (signedTx.payload as SignedTransaction).accountIdentifier,
        signedTx.protocol
      )

      const [createResponse, savedProtocol] = await this.beaconService.getVaultRequest((signedTx.payload as SignedTransaction).transaction)

      const selectedProtocol =
        createResponse && savedProtocol && savedProtocol.identifier === protocol.identifier
          ? savedProtocol
          : wallet && wallet.protocol
          ? wallet.protocol
          : protocol

      this.txInfos.push([(signedTx.payload as SignedTransaction).transaction, selectedProtocol, createResponse])
      this.protocols.push(selectedProtocol)
    })
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

    this.txInfos.forEach(async ([signedTx, protocol, createResponse], index) => {
      protocol
        .broadcastTransaction(signedTx)
        .then(async txId => {
          console.log('transaction hash', txId)

          if (createResponse) {
            const response = createResponse(txId)
            this.beaconService.respond(response).catch(handleErrorSentry(ErrorCategory.BEACON))
          }

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
          signed.signedTx = signedTx
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
                  signed.signedTx = signedTx
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
