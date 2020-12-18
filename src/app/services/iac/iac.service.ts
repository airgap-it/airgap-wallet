import { BaseIACService, ProtocolService, SerializerService, UiEventElementsService } from '@airgap/angular-core'
import { BeaconMessageType, SigningType, SignPayloadResponseInput } from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { AccountShareResponse, AirGapMarketWallet, IACMessageDefinitionObject, IACMessageType, MessageSignResponse } from 'airgap-coin-lib'

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
    serializerService: SerializerService,
    public beaconService: BeaconService,
    accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly protocolService: ProtocolService,
    private readonly storageSerivce: WalletStorageService,
    private readonly priceService: PriceService,
    private readonly router: Router
  ) {
    super(uiEventElementsService, serializerService, Promise.resolve(), [
      new BeaconHandler(beaconService),
      new AddressHandler(accountProvider, dataService, router)
    ])

    this.serializerMessageHandlers[IACMessageType.AccountShareResponse] = this.handleWalletSync.bind(this)
    this.serializerMessageHandlers[IACMessageType.TransactionSignResponse] = this.handleSignedTransaction.bind(this)
    this.serializerMessageHandlers[IACMessageType.MessageSignResponse] = this.handleMessageSignResponse.bind(this)
  }

  public async relay(data: string | string[]): Promise<void> {
    const info = {
      data
    }
    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async handleWalletSync(_data: string | string[], deserializedSyncs: IACMessageDefinitionObject[]): Promise<boolean> {
    this.storageSerivce.set(WalletStorageKey.DEEP_LINK, true).catch(handleErrorSentry(ErrorCategory.STORAGE))

    // TODO: handle multiple messages
    const walletSync: AccountShareResponse = deserializedSyncs[0].payload as AccountShareResponse
    const protocol = await this.protocolService.getProtocol(deserializedSyncs[0].protocol)
    const wallet: AirGapMarketWallet = new AirGapMarketWallet(
      protocol,
      walletSync.publicKey,
      walletSync.isExtendedPublicKey,
      walletSync.derivationPath,
      this.priceService
    )
    if (this.router) {
      this.dataService.setData(DataServiceKey.WALLET, wallet)
      this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      return true
    }

    return false
  }

  public async handleSignedTransaction(_data: string | string[], messageDefinitionObjects: IACMessageDefinitionObject[]): Promise<boolean> {
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

  private async handleMessageSignResponse(_data: string | string[], deserializedMessages: IACMessageDefinitionObject[]): Promise<boolean> {
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
