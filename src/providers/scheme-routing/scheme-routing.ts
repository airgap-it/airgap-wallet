import { Injectable } from '@angular/core'
import { AlertController, AlertButton, App, NavController } from 'ionic-angular'
import { DeserializedSyncProtocol, SyncProtocolUtils, EncodedType, SyncWalletRequest, AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountImportPage } from '../../pages/account-import/account-import'
import { TransactionConfirmPage } from '../../pages/transaction-confirm/transaction-confirm'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'

@Injectable()
export class SchemeRoutingProvider {
  private navController: NavController
  /* TS 2.7 feature
  private syncSchemeHandlers: {
    [key in EncodedType]: (deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function) => Promise<boolean>
  }
  */
  private syncSchemeHandlers: ((deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function) => Promise<boolean>)[] = []

  constructor(protected app: App, private alertController: AlertController) {
    /* TS 2.7 feature
    this.syncSchemeHandlers = {
      [EncodedType.WALLET_SYNC]: this.handleWalletSync.bind(this),
      [EncodedType.UNSIGNED_TRANSACTION]: this.syncTypeNotSupportedAlert.bind(this),
      [EncodedType.SIGNED_TRANSACTION]: this.handleSignedTransaction.bind(this)
    }
    */
    this.syncSchemeHandlers[EncodedType.WALLET_SYNC] = this.handleWalletSync.bind(this)
    this.syncSchemeHandlers[EncodedType.UNSIGNED_TRANSACTION] = this.syncTypeNotSupportedAlert.bind(this)
    this.syncSchemeHandlers[EncodedType.SIGNED_TRANSACTION] = this.handleSignedTransaction.bind(this)
  }

  async handleNewSyncRequest(
    navCtrl: NavController,
    rawString: string,
    scanAgainCallback: Function = () => {
      /* */
    }
  ) {
    this.navController = navCtrl
    const syncProtocol = new SyncProtocolUtils()

    let url = new URL(rawString)
    let d = url.searchParams.get('d')

    if (d.length === 0) {
      d = rawString // Fallback to support raw data QRs
    }

    try {
      const deserializedSync = await syncProtocol.deserialize(d)

      if (deserializedSync.type in EncodedType) {
        // Only handle types that we know
        return this.syncSchemeHandlers[deserializedSync.type](deserializedSync, scanAgainCallback)
      } else {
        return this.syncTypeNotSupportedAlert(deserializedSync, scanAgainCallback)
      }
    } catch (e) {
      console.error('Deserialization of sync failed', e)
    }
  }

  async handleWalletSync(deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function) {
    // tslint:disable-next-line:no-unnecessary-type-assertion
    const walletSync = deserializedSync.payload as SyncWalletRequest
    const wallet = new AirGapMarketWallet(
      deserializedSync.protocol,
      walletSync.publicKey,
      walletSync.isExtendedPublicKey,
      walletSync.derivationPath
    )
    if (this.navController) {
      this.navController
        .push(AccountImportPage, {
          wallet: wallet
        })
        .then(v => {
          console.log('WalletImportPage openend', v)
          // this.navController.push(PortfolioPage)
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      /*
        const cancelButton = {
        text: 'Okay!',
        role: 'cancel',
        handler: () => {
          scanAgainCallback()
        }
      }
      this.showAlert(
        'No secret found',
        'You do not have any compatible wallet for this public key in AirGap. Please import your secret and create the corresponding wallet to sign this transaction',
        [cancelButton]
      )
        */
    }
  }

  async handleSignedTransaction(deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function) {
    if (this.navController) {
      this.navController
        .push(TransactionConfirmPage, {
          signedTransactionSync: deserializedSync
        })
        .then(v => {
          console.log('TransactionConfirmPage opened', v)
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  /*
  async handleUnsignedTransaction(
    deserializedSyncProtocol: DeserializedSyncProtocol,
    scanAgainCallback: Function
  ) {
    console.log('unhandled transaction', deserializedSyncProtocol)
    const unsignedTransaction = deserializedSyncProtocol.payload as UnsignedTransaction

    const correctWallet = this.secretsProvider.findWalletByPublicKeyAndProtocolIdentifier(
      unsignedTransaction.publicKey,
      deserializedSyncProtocol.protocol
    )

    console.log('correct wallet', correctWallet)

    if (!correctWallet) {
      const cancelButton = {
        text: 'Okay!',
        role: 'cancel',
        handler: () => {
          scanAgainCallback()
        }
      }
      this.showAlert(
        'No secret found',
        'You do not have any compatible wallet for this public key in AirGap. Please import your secret and create the corresponding wallet to sign this transaction',
        [cancelButton]
      )
    } else {
      const navController = this.getNavController()
      if (navController) {
        navController.push(TransactionDetailPage, {
          transaction: unsignedTransaction,
          wallet: correctWallet
        })
      }
    }
  }
*/
  private async syncTypeNotSupportedAlert(deserializedSyncProtocol: DeserializedSyncProtocol, scanAgainCallback: Function) {
    const cancelButton = {
      text: 'Okay!',
      role: 'cancel',
      handler: () => {
        scanAgainCallback()
      }
    }
    this.showAlert('Sync type not supported', 'Please use another app to scan this QR.', [cancelButton]).catch(
      handleErrorSentry(ErrorCategory.NAVIGATION)
    )
  }

  public async showAlert(title: string, message: string, buttons: AlertButton[]) {
    let alert = this.alertController.create({
      title,
      message,
      enableBackdropDismiss: false,
      buttons
    })
    alert.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
