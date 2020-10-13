import { ProtocolService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { SubProtocolType, ICoinSubProtocol } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { assertNever } from 'airgap-coin-lib/dist/serializer/message'
import { MainProtocolSymbols } from 'airgap-coin-lib'
import { PriceService } from 'src/app/services/price/price.service'

import { AddTokenActionContext } from '../../models/actions/AddTokenAction'
import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

export interface IAccountWrapper {
  selected: boolean
  wallet: AirGapMarketWallet
}

@Component({
  selector: 'page-sub-account-add',
  templateUrl: 'sub-account-add.html',
  styleUrls: ['./sub-account-add.scss']
})
export class SubAccountAddPage {
  public mainProtocolSymbols: typeof MainProtocolSymbols = MainProtocolSymbols

  public wallet: AirGapMarketWallet
  public subAccounts: IAccountWrapper[] = []

  public actionCallback: (context: AddTokenActionContext) => void

  public subProtocolType: SubProtocolType
  public subProtocolTypes: typeof SubProtocolType = SubProtocolType

  public typeLabel: string = ''
  private subProtocols: ICoinSubProtocol[]
  private filteredSubProtocols: ICoinSubProtocol[]

  private LIMIT: number = 10
  private PROTOCOLS_LOADED: number = 0
  public searchTerm: string = ''

  public infiniteEnabled: boolean = false

  constructor(
    private readonly navController: NavController,
    private readonly route: ActivatedRoute,
    private readonly accountProvider: AccountProvider,
    private readonly priceService: PriceService,
    private readonly protocolService: ProtocolService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.actionCallback = info.actionCallback
      this.subProtocolType = info.subProtocolType
      this.wallet = info.wallet
    }

    if (this.subProtocolType === SubProtocolType.ACCOUNT) {
      this.initWithAccountSubProtocol()
    } else if (this.subProtocolType === SubProtocolType.TOKEN) {
      this.initWithTokenSubProtocol()
    } else {
      assertNever(this.subProtocolType)
    }
  }

  public toggleAccount(account: IAccountWrapper): void {
    account.selected = !account.selected
  }

  public addSubAccounts(): void {
    this.actionCallback({ subAccounts: this.subAccounts, accountProvider: this.accountProvider, location: this.navController })
  }

  private initWithAccountSubProtocol(): void {
    this.typeLabel = 'add-sub-account.accounts_label'
  }

  private async initWithTokenSubProtocol(): Promise<void> {
    this.typeLabel = 'add-sub-account.tokens_label'

    this.subProtocols = (await this.protocolService.getSubProtocols(this.wallet.protocol.identifier as MainProtocolSymbols)).filter(
      protocol => protocol.subProtocolType === SubProtocolType.TOKEN
    )
    this.infiniteEnabled = true
    this.loadSubAccounts()
  }

  public setFilteredItems(searchTerm: string): void {
    this.subAccounts = []
    if (searchTerm.length === 0) {
      this.filteredSubProtocols = this.subProtocols
      this.infiniteEnabled = true
      this.loadSubAccounts()
    } else {
      this.filteredSubProtocols = this.subProtocols.filter((protocol: ICoinSubProtocol) => {
        const searchTermLowerCase: string = searchTerm.toLowerCase()
        const hasMatchingName: boolean = protocol.name.toLowerCase().includes(searchTermLowerCase)
        const hasMatchingSymbol: boolean = protocol.symbol.toLowerCase().includes(searchTermLowerCase)

        return hasMatchingName || hasMatchingSymbol
      })
      this.infiniteEnabled = false
      this.PROTOCOLS_LOADED = 0
      this.loadSubAccounts(true)
    }
  }

  public async doInfinite(event) {
    if (!this.infiniteEnabled) {
      return event.target.complete()
    }
    await this.loadSubAccounts()
    event.target.complete()
  }

  private async loadSubAccounts(filtered: boolean = false) {
    const subProtocols = filtered ? [...this.filteredSubProtocols] : [...this.subProtocols]
    const newSubProtocols = subProtocols.slice(this.PROTOCOLS_LOADED, this.PROTOCOLS_LOADED + this.LIMIT)
    if (newSubProtocols.length < this.LIMIT) {
      this.infiniteEnabled = false
    }
    newSubProtocols.forEach((subProtocol: ICoinSubProtocol) => {
      const wallet: AirGapMarketWallet = new AirGapMarketWallet(
        subProtocol,
        this.wallet.publicKey,
        this.wallet.isExtendedPublicKey,
        this.wallet.derivationPath,
        this.priceService
      )
      const exists: boolean = this.accountProvider.walletExists(wallet)
      if (!exists) {
        wallet.addresses = this.wallet.addresses
        wallet
          .synchronize()
          .then(() => {
            this.subAccounts.push({ selected: false, wallet })
          })
          .catch(handleErrorSentry(ErrorCategory.COINLIB))
      }
    })
    this.PROTOCOLS_LOADED += this.LIMIT
  }
}
