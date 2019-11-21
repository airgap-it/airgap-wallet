import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController } from '@ionic/angular'
import { AccountShareResponse, AirGapMarketWallet, IACMessageDefinitionObject, IACMessageType, supportedProtocols } from 'airgap-coin-lib'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { SerializerService } from '../../services/serializer/serializer.service'
import { partition, to } from '../../utils/utils'
import { AccountProvider } from '../account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

enum IACResult {
  SUCCESS = 0,
  PARTIAL = 1,
  ERROR = 2
}

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
    private readonly dataService: DataService,
    private readonly serializerService: SerializerService
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

  private async handlePaymentUrl(data: string, scanAgainCallback: Function): Promise<void> {
    const splits: string[] = data.split(':')
    if (splits.length > 1) {
      const [address]: string[] = splits[1].split('?')
      const wallets: AirGapMarketWallet[] = this.accountProvider.getWalletList()
      let foundMatch: boolean = false
      for (const protocol of supportedProtocols()) {
        if (splits[0].toLowerCase() === protocol.symbol.toLowerCase() || splits[0].toLowerCase() === protocol.name.toLowerCase()) {
          const [compatibleWallets, incompatibleWallets]: [AirGapMarketWallet[], AirGapMarketWallet[]] = partition<AirGapMarketWallet>(
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
      const { compatibleWallets, incompatibleWallets } = await this.accountProvider.getCompatibleAndIncompatibleWalletsForAddress(data)
      if (compatibleWallets.length > 0) {
        const info = {
          address: data,
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

  public async handleNewSyncRequest(
    router: Router,
    data: string | string[],
    scanAgainCallback: Function = (scanResult: { currentPage: number; totalPageNumber: number }): void => {
      /* */
    }
  ): Promise<IACResult> {
    this.router = router
    const [error, deserializedSync]: [Error, IACMessageDefinitionObject[]] = await to(this.serializerService.deserialize(data))

    if (error && !error.message) {
      scanAgainCallback(error)

      return IACResult.PARTIAL
    } else if (error && error.message) {
      await this.handlePaymentUrl(Array.isArray(data) ? data[0] : data, scanAgainCallback)

      return IACResult.SUCCESS
    }
    const firstMessage: IACMessageDefinitionObject = deserializedSync[0]

    if (firstMessage.type in IACMessageType) {
      this.syncSchemeHandlers[firstMessage.type](firstMessage, scanAgainCallback).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))

      return IACResult.SUCCESS
    } else {
      this.syncTypeNotSupportedAlert(firstMessage, scanAgainCallback).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))

      return IACResult.ERROR
    }
  }

  public async handleWalletSync(deserializedSync: IACMessageDefinitionObject, scanAgainCallback: Function): Promise<void> {
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
