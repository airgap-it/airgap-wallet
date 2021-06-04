import { BaseIACService, ClipboardService, DeeplinkService, ProtocolService, UiEventElementsService } from '@airgap/angular-core'
import { BeaconMessageType, SigningType, SignPayloadResponseInput } from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import {
  AccountShareResponse,
  AirGapMarketWallet,
  AirGapWalletStatus,
  IACMessageDefinitionObject,
  IACMessageType,
  MessageSignResponse
} from '@airgap/coinlib-core'

import { AccountProvider } from '../account/account.provider'
import { BeaconService } from '../beacon/beacon.service'
import { DataService, DataServiceKey } from '../data/data.service'
import { PriceService } from '../price/price.service'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from '../storage/storage'

import { AddressHandler } from './custom-handlers/address-handler'
import { BeaconHandler } from './custom-handlers/beacon-handler'

@Injectable({
  providedIn: 'root'
})
export class IACService extends BaseIACService {
  constructor(
    uiEventElementsService: UiEventElementsService,
    public beaconService: BeaconService,
    public readonly deeplinkService: DeeplinkService,
    accountProvider: AccountProvider,
    private readonly dataService: DataService,
    protected readonly clipboard: ClipboardService,
    private readonly protocolService: ProtocolService,
    private readonly storageSerivce: WalletStorageService,
    private readonly priceService: PriceService,
    private readonly router: Router
  ) {
    super(
      uiEventElementsService,
      clipboard,
      Promise.resolve(),
      [new BeaconHandler(beaconService), new AddressHandler(accountProvider, dataService, router)],
      deeplinkService
    )

    this.serializerMessageHandlers[IACMessageType.AccountShareResponse as any] = this.handleWalletSync.bind(this)
    this.serializerMessageHandlers[IACMessageType.TransactionSignResponse as any] = this.handleSignedTransaction.bind(this)
    this.serializerMessageHandlers[IACMessageType.MessageSignResponse as any] = this.handleMessageSignResponse.bind(this)
  }

  public async relay(data: string | string[]): Promise<void> {
    const info = {
      data
    }
    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async handleWalletSync(deserializedSyncs: IACMessageDefinitionObject[]): Promise<boolean> {
    this.storageSerivce.set(WalletStorageKey.DEEP_LINK, true).catch(handleErrorSentry(ErrorCategory.STORAGE))

    // TODO: handle multiple messages
    const walletSync: AccountShareResponse = deserializedSyncs[0].payload as AccountShareResponse
    const protocol = await this.protocolService.getProtocol(deserializedSyncs[0].protocol)
    const wallet: AirGapMarketWallet = new AirGapMarketWallet(
      protocol,
      walletSync.publicKey,
      walletSync.isExtendedPublicKey,
      walletSync.derivationPath,
      '',
      AirGapWalletStatus.ACTIVE,
      this.priceService
    )
    if (this.router) {
      this.dataService.setData(DataServiceKey.WALLET, wallet)
      this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      return true
    }

    return false
  }

  public async handleSignedTransaction(messageDefinitionObjects: IACMessageDefinitionObject[]): Promise<boolean> {
    console.log('handleSignedTransaction', messageDefinitionObjects)
    if (this.router) {
      const info = {
        messageDefinitionObjects: messageDefinitionObjects
      }
      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      return true
    }

    return false
  }

  private async handleMessageSignResponse(deserializedMessages: IACMessageDefinitionObject[]): Promise<boolean> {
    const cachedRequest = await this.beaconService.getVaultRequest(deserializedMessages[0].id)
    const messageSignResponse = deserializedMessages[0].payload as MessageSignResponse
    const response: SignPayloadResponseInput = {
      type: BeaconMessageType.SignPayloadResponse,
      id: cachedRequest[0].id,
      signature: messageSignResponse.signature,
      signingType: SigningType.RAW
    }
    await this.beaconService.respond(response)
    return false
  }
}
