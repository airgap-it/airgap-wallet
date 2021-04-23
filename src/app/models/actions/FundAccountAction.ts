import { AirGapMarketWallet, MainProtocolSymbols } from '@airgap/coinlib-core'
import { Action } from '@airgap/coinlib-core/actions/Action'
import { Router } from '@angular/router'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { partition } from 'src/app/utils/utils'

import { WalletActionInfo } from '../ActionGroup'

export interface FundAccountActionContext {
  wallet: AirGapMarketWallet
  accountProvider: AccountProvider
  dataService: DataService
  router: Router
}

export class FundAccountAction extends Action<void, FundAccountActionContext> {
  public get identifier() {
    return 'fund-action'
  }

  public info: WalletActionInfo = {
    name: 'account-transaction-list.fund_label',
    icon: 'logo-usd'
  }

  protected async perform(): Promise<void> {
    const wallets: AirGapMarketWallet[] = this.context.accountProvider.getWalletList()
    const [compatibleWallets, incompatibleWallets]: [AirGapMarketWallet[], AirGapMarketWallet[]] = partition<AirGapMarketWallet>(
      wallets.filter((wallet: AirGapMarketWallet) => wallet.publicKey !== this.context.wallet.publicKey),
      (wallet: AirGapMarketWallet) => this.isCompatible(wallet)
    )

    const info = {
      actionType: 'fund-account',
      targetIdentifier: this.context.wallet.protocol.identifier,
      address: this.context.wallet.receivingPublicAddress,
      compatibleWallets,
      incompatibleWallets
    }
    this.context.dataService.setData(DataServiceKey.WALLET, info)
    this.context.router.navigateByUrl(`/select-wallet/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private isCompatible(wallet: AirGapMarketWallet): boolean {
    const compatibleIdentifiers: Set<string> = new Set(this.context.wallet.protocol.identifier)
    if (this.context.wallet.protocol.identifier === MainProtocolSymbols.XTZ_SHIELDED) {
      compatibleIdentifiers.add(MainProtocolSymbols.XTZ)
    }

    return compatibleIdentifiers.has(wallet.protocol.identifier)
  }
}
