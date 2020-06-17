import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'
import { AirGapMarketWallet, getProtocolByIdentifier } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { assertNever } from 'airgap-coin-lib/dist/serializer/message'

import { AddTokenActionContext } from '../../models/actions/AddTokenAction'
import { AccountProvider } from '../../services/account/account.provider'
import { ProtocolsProvider, defaultChainNetwork } from '../../services/protocols/protocols'
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
  public wallet: AirGapMarketWallet
  public subAccounts: IAccountWrapper[] = []
  public actionCallback: (context: AddTokenActionContext) => void

  public subProtocolType: SubProtocolType
  public subProtocolTypes: typeof SubProtocolType = SubProtocolType

  public typeLabel: string = ''

  constructor(
    private readonly navController: NavController,
    private readonly route: ActivatedRoute,
    private readonly accountProvider: AccountProvider,
    private readonly protocolsProvider: ProtocolsProvider
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.actionCallback = info.actionCallback
      this.subProtocolType = info.subProtocolType
      this.wallet = info.wallet
      console.log('info', info)
    }

    if (this.subProtocolType === SubProtocolType.ACCOUNT) {
      this.typeLabel = 'add-sub-account.accounts_label'
    } else if (this.subProtocolType === SubProtocolType.TOKEN) {
      this.typeLabel = 'add-sub-account.tokens_label'
    } else {
      assertNever(this.subProtocolType)
    }
    if (this.subProtocolType === SubProtocolType.TOKEN) {
      this.wallet.protocol.subProtocols.forEach(subProtocol => {
        if (this.protocolsProvider.getEnabledSubProtocols().indexOf(subProtocol.identifier) >= 0) {
          const protocol = getProtocolByIdentifier(subProtocol.identifier, defaultChainNetwork)
          const wallet: AirGapMarketWallet = new AirGapMarketWallet(
            protocol,
            this.wallet.publicKey,
            this.wallet.isExtendedPublicKey,
            this.wallet.derivationPath
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
        }
      })
    }
  }

  public toggleAccount(account: IAccountWrapper): void {
    account.selected = !account.selected
  }

  public addSubAccounts(): void {
    this.actionCallback({ subAccounts: this.subAccounts, accountProvider: this.accountProvider, location: this.navController })
  }
}
