import {
  AppConfig,
  APP_CONFIG,
  BaseIACService,
  ClipboardService,
  DeeplinkService,
  ProtocolService,
  RelayMessage,
  UiEventElementsService
} from '@airgap/angular-core'
import { BeaconMessageType, SigningType, SignPayloadResponseInput } from '@airgap/beacon-sdk'
import { Inject, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import {
  AccountShareResponse,
  AirGapMarketWallet,
  AirGapWalletStatus,
  IACMessageDefinitionObject,
  IACMessageType,
  MainProtocolSymbols,
  MessageSignResponse,
  ProtocolSymbols
} from '@airgap/coinlib-core'

import { AccountProvider } from '../account/account.provider'
import { BeaconService } from '../beacon/beacon.service'
import { DataService, DataServiceKey } from '../data/data.service'
import { PriceService } from '../price/price.service'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from '../storage/storage'
import { WalletconnectService } from '../walletconnect/walletconnect.service'

import { AddressHandler } from './custom-handlers/address-handler'
import { BeaconHandler } from './custom-handlers/beacon-handler'
import { WalletConnectHandler } from './custom-handlers/walletconnect-handler'

@Injectable({
  providedIn: 'root'
})
export class IACService extends BaseIACService {
  constructor(
    uiEventElementsService: UiEventElementsService,
    public beaconService: BeaconService,
    public readonly deeplinkService: DeeplinkService,
    accountProvider: AccountProvider,
    public walletConnectService: WalletconnectService,
    private readonly dataService: DataService,
    protected readonly clipboard: ClipboardService,
    private readonly protocolService: ProtocolService,
    private readonly storageSerivce: WalletStorageService,
    private readonly priceService: PriceService,
    private readonly router: Router,
    @Inject(APP_CONFIG) appConfig: AppConfig
  ) {
    super(
      uiEventElementsService,
      clipboard,
      Promise.resolve(),
      [
        new BeaconHandler(beaconService),
        new WalletConnectHandler(walletConnectService),
        new AddressHandler(accountProvider, dataService, router) // Address handler is flexible because of regex, so it should be last.
      ],
      deeplinkService,
      appConfig
    )

    this.serializerMessageHandlers[IACMessageType.AccountShareResponse as any] = this.handleWalletSync.bind(this)
    this.serializerMessageHandlers[IACMessageType.TransactionSignResponse as any] = this.handleSignedTransaction.bind(this)
    this.serializerMessageHandlers[IACMessageType.MessageSignResponse as any] = this.handleMessageSignResponse.bind(this)
  }

  public async relay(data: RelayMessage): Promise<void> {
    const info = {
      data: (data as any).messages, // TODO: Fix types
      isRelay: true
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
    const requestId = deserializedMessages[0].id
    const cachedRequest = await this.beaconService.getVaultRequest(requestId)

    const messageSignResponse = deserializedMessages[0].payload as MessageSignResponse
    const protocol: ProtocolSymbols = deserializedMessages[0].protocol
    const response: SignPayloadResponseInput = {
      type: BeaconMessageType.SignPayloadResponse,
      id: cachedRequest[0] ? cachedRequest[0].id : requestId,
      signature: messageSignResponse.signature,
      signingType: SigningType.RAW
    }
    if (protocol === MainProtocolSymbols.XTZ) {
      await this.beaconService.respond(response)
    } else if (protocol === MainProtocolSymbols.ETH) {
      await this.walletConnectService.approveRequest(response.id, response.signature)
    }
    return false
  }
}
