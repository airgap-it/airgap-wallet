import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController } from '@ionic/angular'
import {
  AirGapMarketWallet,
  supportedProtocols,
  IACMessageType,
  IACMessageDefinitionObject,
  Serializer,
  AccountShareResponse
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
    [key in IACMessageType]: (deserializedSync: IACMessageDefinitionObject, scanAgainCallback: Function) => Promise<boolean>
  }

  constructor(
    private readonly alertController: AlertController,
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService
  ) {
    this.syncSchemeHandlers = {
      [IACMessageType.MetadataRequest]: this.syncTypeNotSupportedAlert.bind(this),
      [IACMessageType.MetadataResponse]: this.syncTypeNotSupportedAlert.bind(this),
      [IACMessageType.AccountShareRequest]: this.syncTypeNotSupportedAlert.bind(this),
      [IACMessageType.AccountShareResponse]: this.handleWalletSync.bind(this),
      [IACMessageType.TransactionSignRequest]: this.syncTypeNotSupportedAlert.bind(this),
      [IACMessageType.TransactionSignResponse]: this.handleSignedTransaction.bind(this),
      [IACMessageType.MessageSignRequest]: this.syncTypeNotSupportedAlert.bind(this),
      [IACMessageType.MessageSignResponse]: this.syncTypeNotSupportedAlert.bind(this)
    }
  }

  public async handleNewSyncRequest(
    router: Router,
    rawString: string | string[],
    scanAgainCallback: Function = (scanResult: { currentPage: number; totalPageNumber: number }): void => {
      /* */
    }
  ): Promise<void> {
    this.router = router
    const serializer: Serializer = new Serializer()

    try {
      // TODO: Refactor ASAP
      if (Array.isArray(rawString)) {
        try {
          const deserializedSync = await serializer.deserialize(rawString)

          if (deserializedSync[0].type in IACMessageType) {
            // Only handle types that we know
            // TODO: Support multi txs
            this.syncSchemeHandlers[deserializedSync[0].type](deserializedSync[0], scanAgainCallback).catch(
              handleErrorSentry(ErrorCategory.SCHEME_ROUTING)
            )

            return
          } else {
            this.syncTypeNotSupportedAlert(deserializedSync[0], scanAgainCallback).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))

            return
          }
        } catch (err) {
          scanAgainCallback(err)
        }

        return
      }
      const url: URL = new URL(rawString)
      let data: string = rawString // Fallback to support raw data QRs
      data = url.searchParams.get('d')

      try {
        const deserializedSync = await serializer.deserialize([data])

        if (deserializedSync[0].type in IACMessageType) {
          // Only handle types that we know
          // TODO: Support multi txs
          this.syncSchemeHandlers[deserializedSync[0].type](deserializedSync[0], scanAgainCallback).catch(
            handleErrorSentry(ErrorCategory.SCHEME_ROUTING)
          )

          return
        } else {
          this.syncTypeNotSupportedAlert(deserializedSync[0], scanAgainCallback).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))

          return
        }
      } catch (error) {
        // Temporarily comment out to catch bitcoin:xxx cases
        scanAgainCallback(error)
        console.error('Deserialization of sync failed', error)
      }
    } catch (error) {
      console.warn('x', error)

      const splits: string[] = (rawString as string).split(':')
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
          rawString as string
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

  public async handleWalletSync(deserializedSync: IACMessageDefinitionObject, scanAgainCallback: Function): Promise<void> {
    // tslint:disable-next-line:no-unnecessary-type-assertion
    const walletSync: AccountShareResponse = deserializedSync.payload as AccountShareResponse
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

  public async handleSignedTransaction(deserializedSync: IACMessageDefinitionObject, scanAgainCallback: Function): Promise<void> {
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
  private async syncTypeNotSupportedAlert(
    _deserializedSyncProtocol: IACMessageDefinitionObject,
    scanAgainCallback: Function
  ): Promise<void> {
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
