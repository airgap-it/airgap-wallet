import { IsolatedModuleInstalledMetadata, IsolatedProtocol } from '@airgap/angular-core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Injectable } from '@angular/core'
import { AccountProvider } from '../account/account.provider'
import { WalletModulesService } from './modules.service'

// TODO: this service exists to prevent cyclic dependency between `AccountProvider` and `WalletModulesService`, investigate if there's a better solution
@Injectable({
  providedIn: 'root'
})
export class WalletEnhancedModulesService {
  constructor(
    public readonly base: WalletModulesService,
    private readonly accountProvider: AccountProvider,
  ) {}

  public async removeInstalledModule(metadata: IsolatedModuleInstalledMetadata, keepAccounts: boolean = false) {
    await this.base.removeInstalledModules([metadata.module.identifier])
    if (keepAccounts) {
      return
    }

    const allWallets: AirGapMarketWallet[] = this.accountProvider.getWalletList()
    const allWalletsWithIdentifiers: [AirGapMarketWallet, string][] = await Promise.all(
      allWallets.map(async (wallet: AirGapMarketWallet) => [wallet, await wallet.protocol.getIdentifier()] as [AirGapMarketWallet, string])
    )

    const removedProtocols: Set<string> = new Set(metadata.module.protocols.map((protocol: IsolatedProtocol) => protocol.identifier))
    const toRemoveWallets: AirGapMarketWallet[] = allWalletsWithIdentifiers
      .filter(([_, protocolIdentifier]: [AirGapMarketWallet, string]) => removedProtocols.has(protocolIdentifier))
      .map(([wallet, _]: [AirGapMarketWallet, string]) => wallet)

    await Promise.all(
      toRemoveWallets.map((wallet: AirGapMarketWallet) => this.accountProvider.removeWallet(wallet))
    )
  }
}