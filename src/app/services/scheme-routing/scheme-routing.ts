import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController } from '@ionic/angular'
import {
  AirGapMarketWallet,
  DeserializedSyncProtocol,
  EncodedType,
  supportedProtocols,
  SyncProtocolUtils,
  SyncWalletRequest
} from 'airgap-coin-lib'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { AccountProvider } from '../account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

@Injectable({
  providedIn: 'root'
})
export class SchemeRoutingProvider {
  private router: Router

  private readonly syncSchemeHandlers: {
    [key in EncodedType]: (deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function) => Promise<boolean>
  }

  constructor(
    private readonly alertController: AlertController,
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService
  ) {
    this.syncSchemeHandlers = {
      [EncodedType.WALLET_SYNC]: this.handleWalletSync.bind(this),
      [EncodedType.UNSIGNED_TRANSACTION]: this.syncTypeNotSupportedAlert.bind(this),
      [EncodedType.SIGNED_TRANSACTION]: this.handleSignedTransaction.bind(this)
    }
  }

  public async handleNewSyncRequest(
    router: Router,
    rawString: string,
    scanAgainCallback: Function = (): void => {
      /* */
    }
  ): Promise<void> {
    this.router = router
    const syncProtocol: SyncProtocolUtils = new SyncProtocolUtils()

    try {
      const url: URL = new URL(rawString)
      let data: string = rawString // Fallback to support raw data QRs
      data = url.searchParams.get('d')

      // try {
      const deserializedSync: DeserializedSyncProtocol = await syncProtocol.deserialize(data)

      if (deserializedSync.type in EncodedType) {
        // Only handle types that we know
        this.syncSchemeHandlers[deserializedSync.type](deserializedSync, scanAgainCallback).catch(
          handleErrorSentry(ErrorCategory.SCHEME_ROUTING)
        )

        return
      } else {
        this.syncTypeNotSupportedAlert(deserializedSync, scanAgainCallback).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))

        return
      }
      // }
      /* Temporarily comment out to catch bitcoin:xxx cases
      catch (error) {
        console.error('Deserialization of sync failed', error)
      }
      */
    } catch (error) {
      console.warn(error)

      const splits: string[] = rawString.split(':')
      if (splits.length > 1) {
        const [address]: string[] = splits[1].split('?')
        const wallets: AirGapMarketWallet[] = this.accountProvider.getWalletList()
        let foundMatch: boolean = false
        for (const protocol of supportedProtocols()) {
          if (splits[0].toLowerCase() === protocol.symbol.toLowerCase() || splits[0].toLowerCase() === protocol.name.toLowerCase()) {
            // TODO: Move to utils
            // tslint:disable-next-line:typedef
            const partition = <T>(array: T[], isValid: (element: T) => boolean): [T[], T[]] => {
              const pass: T[] = []
              const fail: T[] = []
              array.forEach(element => {
                if (isValid(element)) {
                  pass.push(element)
                } else {
                  fail.push(element)
                }
              })

              return [pass, fail]
            }

            const [compatibleWallets, incompatibleWallets] = partition<AirGapMarketWallet>(
              wallets,
              (wallet: AirGapMarketWallet) => wallet.protocolIdentifier === protocol.identifier
            )

            if (compatibleWallets.length > 0) {
              foundMatch = true
              const info = {
                address,
                compatibleWallets,
                incompatibleWallets
              }
              this.dataService.setData(DataServiceKey.WALLET, info)
              this.router.navigateByUrl(`/select-wallet/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
            }
            break
          }
        }
        if (!foundMatch) {
          return scanAgainCallback()
        }
      } else {
        const { compatibleWallets, incompatibleWallets } = await this.accountProvider.getCompatibleAndIncompatibleWalletsForAddress(
          rawString
        )
        if (compatibleWallets.length > 0) {
          const info = {
            address: rawString,
            compatibleWallets,
            incompatibleWallets
          }
          this.dataService.setData(DataServiceKey.WALLET, info)
          this.router.navigateByUrl(`/select-wallet/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        } else {
          return scanAgainCallback()
        }
      }
    }
  }

  public async handleWalletSync(deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function): Promise<void> {
    // tslint:disable-next-line:no-unnecessary-type-assertion
    const walletSync: SyncWalletRequest = deserializedSync.payload as SyncWalletRequest
    const wallet: AirGapMarketWallet = new AirGapMarketWallet(
      deserializedSync.protocol,
      walletSync.publicKey,
      walletSync.isExtendedPublicKey,
      walletSync.derivationPath
    )
    if (this.router) {
      this.dataService.setData(DataServiceKey.WALLET, wallet)
      this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  public async handleSignedTransaction(deserializedSync: DeserializedSyncProtocol, scanAgainCallback: Function): Promise<void> {
    if (this.router) {
      const info = {
        signedTransactionSync: deserializedSync
      }
      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
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
  private async syncTypeNotSupportedAlert(deserializedSyncProtocol: DeserializedSyncProtocol, scanAgainCallback: Function): Promise<void> {
    const cancelButton = {
      text: 'Okay!',
      role: 'cancel',
      handler: (): void => {
        scanAgainCallback()
      }
    }
    this.showAlert('Sync type not supported', 'Please use another app to scan this QR.', [cancelButton]).catch(
      handleErrorSentry(ErrorCategory.NAVIGATION)
    )
  }

  public async showAlert(title: string, message: string, buttons: any): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertController.create({
      header: title,
      message,
      backdropDismiss: false,
      buttons
    })
    alert.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
