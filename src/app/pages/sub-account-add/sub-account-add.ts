import { ProtocolService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { SubProtocolType, ICoinSubProtocol } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { assertNever } from 'airgap-coin-lib/dist/serializer/message'
import { MainProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'
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
  private LIMIT: number = 10
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
      console.log('info', info)
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

    this.subProtocols = await this.protocolService.getSubProtocols(MainProtocolSymbols.ETH)
    this.infiniteEnabled = true
    this.loadSubAccounts(0)
  }

  public async doInfinite(event) {
    if (!this.infiniteEnabled) {
      return event.target.complete()
    }
    const subAccountsLength = this.subAccounts.length
    console.log('subAccountsLength', subAccountsLength)

    await this.loadSubAccounts(subAccountsLength)
    if (this.subAccounts.length - subAccountsLength < this.LIMIT) {
      console.log('INFINITE DISABLED')
      // this.infiniteEnabled = false
    }
    event.target.complete()
  }

  private async loadSubAccounts(subAccountsLength: number) {
    const subProtocols = [...this.subProtocols]
    const newSubProtocols = subProtocols.slice(subAccountsLength, subAccountsLength + this.LIMIT)
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
            console.log('push', wallet.protocol.identifier)
            this.subAccounts.push({ selected: false, wallet })
          })
          .catch(handleErrorSentry(ErrorCategory.COINLIB))
      }
    })
  }
}
