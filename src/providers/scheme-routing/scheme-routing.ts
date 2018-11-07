import { Injectable } from '@angular/core'
import { AlertController, AlertButton, App, NavController } from 'ionic-angular'
import {
  DeserializedSyncProtocol,
  UnsignedTransaction,
  SyncProtocolUtils,
  EncodedType,
  SyncWalletRequest,
  AirGapMarketWallet
} from 'airgap-coin-lib'
import { TransactionDetailPage } from '../../pages/transaction-detail/transaction-detail'
import { WalletImportPage } from '../../pages/wallet-import/wallet-import'
import { TransactionConfirmPage } from '../../pages/transaction-confirm/transaction-confirm'

@Injectable()
export class SchemeRoutingProvider {
  private syncSchemeHandlers: {
    [key in EncodedType]: (deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function) => Promise<boolean>
  }

  constructor(protected app: App, private alertController: AlertController) {
    this.syncSchemeHandlers = {
      [EncodedType.WALLET_SYNC]: this.handleWalletSync.bind(this),
      [EncodedType.UNSIGNED_TRANSACTION]: this.syncTypeNotSupportedAlert.bind(this),
      [EncodedType.SIGNED_TRANSACTION]: this.handleSignedTransaction.bind(this)
    }
  }

  private getNavController() {
    return this.app.getActiveNav()
  }

  async handleNewSyncRequest(
    rawString: string,
    scanAgainCallback: Function = () => {
      /* */
    }
  ) {
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
    const walletSync = deserializedSync.payload as SyncWalletRequest
    const wallet = new AirGapMarketWallet(
      deserializedSync.protocol,
      walletSync.publicKey,
      walletSync.isExtendedPublicKey,
      walletSync.derivationPath
    )
    const navController = this.getNavController()
    if (navController) {
      navController
        .push(WalletImportPage, {
          wallet: wallet
        })
        .then(v => {
          console.log('WalletImportPage openend', v)
          // this.navController.push(PortfolioPage)
        })
        .catch(e => {
          console.log('WalletImportPage failed to open', e)
        })
    }
  }

  async handleSignedTransaction(deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function) {
    const navController = this.getNavController()
    if (navController) {
      navController
        .push(TransactionConfirmPage, {
          signedTransactionSync: deserializedSync
        })
        .then(v => {
          console.log('TransactionConfirmPage opened', v)
        })
        .catch(e => {
          console.log('TransactionConfirmPage failed to open', e)
        })
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
    this.showAlert('Sync type not supported', 'Please use another app to scan this QR.', [cancelButton])
  }

  private async showAlert(title: string, message: string, buttons: AlertButton[]) {
    let alert = this.alertController.create({
      title,
      message,
      enableBackdropDismiss: false,
      buttons
    })
    alert.present()
  }
}
