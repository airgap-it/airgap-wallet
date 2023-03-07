import { ProtocolService } from '@airgap/angular-core'
import { AirGapCoinWallet, AirGapMarketWallet, MainProtocolSymbols } from '@airgap/coinlib-core'
import { ICoinSubProtocol, SubProtocolType } from '@airgap/coinlib-core/protocols/ICoinSubProtocol'
import { assertNever } from '@airgap/coinlib-core/utils/assert'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'
import { AirGapMarketWalletGroup } from 'src/app/models/AirGapMarketWalletGroup'
import { PriceService } from 'src/app/services/price/price.service'

import { AddTokenActionContext } from '../../models/actions/AddTokenAction'
import { AccountProvider } from '../../services/account/account.provider'

export interface IAccountWrapper {
  selected: boolean
  wallet: AirGapMarketWallet
  groupId?: string
  groupLabel?: string
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
  public filteredSubAccounts: IAccountWrapper[] = []
  public displayedSubAccounts: IAccountWrapper[] = []

  public actionCallback: (context: AddTokenActionContext) => void

  public subProtocolType: SubProtocolType
  public subProtocolTypes: typeof SubProtocolType = SubProtocolType

  public typeLabel: string = ''

  public searchTerm: string = ''

  public infiniteEnabled: boolean = false
  private readonly limit: number = 10
  private loaded: number = 0

  public publicKey: string
  public protocolID: string
  public addressIndex: undefined

  constructor(
    private readonly navController: NavController,
    private readonly route: ActivatedRoute,
    private readonly accountProvider: AccountProvider,
    private readonly priceService: PriceService,
    private readonly protocolService: ProtocolService
  ) {
    this.publicKey = this.route.snapshot.params.publicKey
    this.protocolID = this.route.snapshot.params.protocolID
    this.addressIndex = this.route.snapshot.params.addressIndex
    this.subProtocolType = this.route.snapshot.params.subProtocolType

    if (this.addressIndex === 'undefined') {
      this.addressIndex = undefined
    }
    this.wallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(this.publicKey, this.protocolID, this.addressIndex)

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

    const subProtocols = (await this.protocolService.getSubProtocols(this.wallet.protocol.identifier as MainProtocolSymbols)).filter(
      (protocol) => protocol.subProtocolType === SubProtocolType.TOKEN
    )
    this.infiniteEnabled = true
    this.subAccounts = await this.loadSubAccounts(subProtocols)
    await this.loadDisplayedAccounts()
  }

  private async loadSubAccounts(subProtocols: ICoinSubProtocol[]) {
    const accounts: IAccountWrapper[] = (
      await Promise.all(
        subProtocols.map(async (subProtocol) => {
          const walletGroup: AirGapMarketWalletGroup = this.accountProvider.findWalletGroup(this.wallet)
          const wallet: AirGapMarketWallet = new AirGapCoinWallet(
            subProtocol,
            this.wallet.publicKey,
            this.wallet.isExtendedPublicKey,
            this.wallet.derivationPath,
            this.wallet.masterFingerprint,
            this.wallet.status,
            this.priceService
          )
          if (this.accountProvider.walletExists(wallet)) {
            return undefined
          }
          wallet.addresses = this.wallet.addresses
          await wallet.synchronize()

          return {
            wallet,
            selected: false,
            groupId: walletGroup !== undefined ? walletGroup.id : undefined,
            groupLabel: walletGroup !== undefined ? walletGroup.label : undefined
          }
        })
      )
    )
      .filter((account) => account !== undefined)
      .sort((a, b) => a.wallet.getCurrentBalance().minus(b.wallet.getCurrentBalance()).toNumber() * -1)

    return accounts
  }

  public setFilteredItems(searchTerm: string): void {
    this.displayedSubAccounts = []
    this.loaded = 0
    if (searchTerm.length === 0) {
      this.infiniteEnabled = true
      this.loadDisplayedAccounts()
    } else {
      const searchTermLowerCase: string = searchTerm.toLowerCase()
      this.filteredSubAccounts = this.subAccounts.filter((account) => {
        const hasMatchingName: boolean = account.wallet.protocol.name.toLowerCase().includes(searchTermLowerCase)
        const hasMatchingSymbol: boolean = account.wallet.protocol.symbol.toLowerCase().includes(searchTermLowerCase)

        return hasMatchingName || hasMatchingSymbol
      })
      this.infiniteEnabled = false
      this.loadDisplayedAccounts(true)
    }
  }

  private async loadDisplayedAccounts(filtered: boolean = false): Promise<void> {
    const newSubAccounts = (filtered ? this.filteredSubAccounts : this.subAccounts).slice(this.loaded, this.loaded + this.limit)
    if (newSubAccounts.length < this.limit) {
      this.infiniteEnabled = false
    }

    newSubAccounts.forEach((account) => {
      if (account.wallet.getCurrentMarketPrice() === undefined) {
        account.wallet.fetchCurrentMarketPrice()
      }
      this.displayedSubAccounts.push(account)
    })

    this.loaded += newSubAccounts.length
  }

  public async doInfinite(event) {
    if (!this.infiniteEnabled) {
      return event.target.complete()
    }
    await this.loadDisplayedAccounts()
    event.target.complete()
  }
}
