import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController } from '@ionic/angular'
import {
  AccountShareResponse,
  AirGapMarketWallet,
  IACMessageDefinitionObject,
  IACMessageType,
  supportedProtocols,
  getProtocolByIdentifier
} from 'airgap-coin-lib'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { SerializerService } from '../../services/serializer/serializer.service'
import { partition, to } from '../../utils/utils'
import { AccountProvider } from '../account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { BeaconService } from '../beacon/beacon.service'
import { StorageProvider, SettingsKey } from '../storage/storage'
import { defaultChainNetwork } from '../protocols/protocols'

export enum IACResult {
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
    [key in IACMessageType]: (deserializedSync: IACMessageDefinitionObject[], scanAgainCallback: Function) => Promise<boolean>
  }

  constructor(
    private readonly alertController: AlertController,
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly serializerService: SerializerService,
    private readonly beaconService: BeaconService,
    private readonly storageProvider: StorageProvider
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
            (wallet: AirGapMarketWallet) => wallet.protocol.identifier === protocol.identifier
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
    scanAgainCallback: Function = (_scanResult: { currentPage: number; totalPageNumber: number }): void => {
      /* */
    }
  ): Promise<IACResult> {
    this.router = router

    // Check if it's a beacon request
    try {
      const json = JSON.parse(typeof data === 'string' ? data : data[0])
      if (json.publicKey && json.relayServer) {
        console.log('Beacon Pairing QR scanned', json)
        await this.beaconService.addPeer({ name: json.name, publicKey: json.publicKey, relayServer: json.relayServer })
      }
    } catch (e) {
      //
    }

    const [error, deserializedSync]: [Error, IACMessageDefinitionObject[]] = await to(this.serializerService.deserialize(data))

    if (error && !error.message) {
      scanAgainCallback(error)

      return IACResult.PARTIAL
    } else if (error && error.message) {
      await this.handlePaymentUrl(Array.isArray(data) ? data[0] : data, scanAgainCallback)

      return IACResult.SUCCESS
    }

    const groupedByType = deserializedSync.reduce(
      (grouped, message) => Object.assign(grouped, { [message.type]: (grouped[message.type] || []).concat(message) }),
      {}
    )

    for (let type in groupedByType) {
      if (type in IACMessageType) {
        this.syncSchemeHandlers[type](groupedByType[type], scanAgainCallback).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
      } else {
        this.syncTypeNotSupportedAlert(groupedByType[type], scanAgainCallback).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))

        return IACResult.ERROR
      }
    }

    return IACResult.SUCCESS
  }

  public async handleWalletSync(deserializedSyncs: IACMessageDefinitionObject[]): Promise<boolean> {
    this.storageProvider.set(SettingsKey.DEEP_LINK, true).catch(handleErrorSentry(ErrorCategory.STORAGE))

    // TODO: handle multiple messages
    const walletSync: AccountShareResponse = deserializedSyncs[0].payload as AccountShareResponse
    const protocol = getProtocolByIdentifier(deserializedSyncs[0].protocol, defaultChainNetwork)
    const wallet: AirGapMarketWallet = new AirGapMarketWallet(
      protocol,
      walletSync.publicKey,
      walletSync.isExtendedPublicKey,
      walletSync.derivationPath
    )
    if (this.router) {
      this.dataService.setData(DataServiceKey.WALLET, wallet)
      this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      return true
    }

    return false
  }

  public async handleSignedTransaction(deserializedSyncTransactions: IACMessageDefinitionObject[]): Promise<boolean> {
    if (this.router) {
      const info = {
        signedTransactionsSync: deserializedSyncTransactions
      }
      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      return true
    }

    return false
  }

  private async syncTypeNotSupportedAlert(
    _deserializedSyncProtocols: IACMessageDefinitionObject[],
    scanAgainCallback: Function
  ): Promise<boolean> {
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

    return false
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
