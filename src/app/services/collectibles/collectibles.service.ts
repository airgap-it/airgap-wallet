import { getMainIdentifier, ProtocolService } from '@airgap/angular-core'
import {
  AirGapMarketWallet,
  AirGapNFTWallet,
  AirGapWalletStatus,
  ICoinProtocol,
  MainProtocolSymbols,
  ProtocolSymbols
} from '@airgap/coinlib-core'
import { Injectable } from '@angular/core'
import { promiseTimeout } from 'src/app/helpers/promise'

import { AccountProvider } from '../account/account.provider'

import { Collectible, CollectibleCursor, CollectibleDetails, CollectibleExplorer } from './collectibles.types'
import { createTezosCollectibleProtocol, tezosCollectibleExplorer } from './tezos/factories'

@Injectable({
  providedIn: 'root'
})
export class CollectiblesService {
  private readonly explorers: Map<ProtocolSymbols, CollectibleExplorer> = new Map()

  public constructor(private readonly protocolService: ProtocolService, private readonly accountProvider: AccountProvider) {}

  public async getCollectibles(wallet: AirGapMarketWallet, page: number = 0, limit: number = 2): Promise<CollectibleCursor | undefined> {
    return this.getExplorer(wallet.protocol.identifier)?.getCollectibles(wallet, page, limit)
  }

  public async getCollectibleDetails(wallet: AirGapMarketWallet, address: string, id: string): Promise<CollectibleDetails | undefined> {
    return this.getExplorer(wallet.protocol.identifier)?.getCollectibleDetails(wallet, address, id)
  }

  public async getCollectibleWallet(mainWallet: AirGapMarketWallet, collectible: Collectible): Promise<AirGapMarketWallet | undefined> {
    let collectibleWallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(
      mainWallet.publicKey,
      collectible.protocolIdentifier,
      mainWallet.addressIndex
    )

    if (!collectibleWallet) {
      const protocol = await this.getProtocol(collectible)
      if (!protocol) {
        return undefined
      }

      collectibleWallet = new AirGapNFTWallet(
        protocol,
        mainWallet.publicKey,
        mainWallet.isExtendedPublicKey,
        mainWallet.derivationPath,
        mainWallet.masterFingerprint,
        AirGapWalletStatus.TRANSIENT,
        mainWallet.priceService,
        mainWallet.addressIndex
      )
      collectibleWallet.addresses = mainWallet.addresses

      const walletGroup = this.accountProvider.walletGroupByWallet(mainWallet)
      await this.accountProvider.addWallets([
        {
          walletToAdd: collectibleWallet,
          groupId: walletGroup.id,
          groupLabel: walletGroup.label,
          options: { updateState: false }
        }
      ])
    }

    await promiseTimeout(5000, collectibleWallet?.synchronize([collectible.id])).catch(() => {})

    return collectibleWallet
  }

  public async getProtocol(collectible: Collectible): Promise<ICoinProtocol | undefined> {
    try {
      let protocol: ICoinProtocol = await this.protocolService.getProtocol(collectible.protocolIdentifier, collectible.networkIdentifier)
      if (
        protocol &&
        protocol.identifier === collectible.protocolIdentifier &&
        protocol.options.network.identifier === collectible.networkIdentifier
      ) {
        return protocol
      }

      switch (getMainIdentifier(collectible.protocolIdentifier)) {
        case MainProtocolSymbols.XTZ:
          protocol = await createTezosCollectibleProtocol(this.protocolService, collectible)
          break
        default:
          throw new Error('[Collectible Service] Unsupported protocol identifier.')
      }

      await this.protocolService.addActiveProtocols(protocol)

      return protocol
    } catch (error) {
      // tslint:disable-next-line: no-console
      console.error(error)

      return undefined
    }
  }

  private getExplorer(identifier: ProtocolSymbols): CollectibleExplorer | undefined {
    const mainIdentifier = getMainIdentifier(identifier)
    if (!this.explorers.has(mainIdentifier)) {
      const explorer = this.createExplorer(mainIdentifier)
      if (explorer) {
        this.explorers.set(mainIdentifier, explorer)
      }
    }

    return this.explorers.get(mainIdentifier)
  }

  private createExplorer(identifier: ProtocolSymbols): CollectibleExplorer | undefined {
    switch (identifier) {
      case MainProtocolSymbols.XTZ:
        return tezosCollectibleExplorer(this.protocolService)
      default:
        return undefined
    }
  }
}
