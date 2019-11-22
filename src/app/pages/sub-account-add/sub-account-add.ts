import { BigNumber } from 'bignumber.js'
import { Location } from '@angular/common'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AirGapMarketWallet, addSubProtocol } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

import { AddTokenActionContext } from '../../models/actions/AddTokenAction'
import { AccountProvider } from '../../services/account/account.provider'
import { ProtocolsProvider } from '../../services/protocols/protocols'
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
    public location: Location,
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

    function assertUnreachable(x: never): void {
      /* */
    }

    if (this.subProtocolType === SubProtocolType.ACCOUNT) {
      this.typeLabel = 'add-sub-account.accounts_label'
    } else if (this.subProtocolType === SubProtocolType.TOKEN) {
      this.typeLabel = 'add-sub-account.tokens_label'
    } else {
      assertUnreachable(this.subProtocolType)
    }

    if (this.subProtocolType === SubProtocolType.TOKEN) {
      this.wallet.coinProtocol.subProtocols.forEach(subProtocol => {
        const enabledsubProtocols = this.protocolsProvider.getEnabledSubProtocols()
        if (this.protocolsProvider.getEnabledSubProtocols().indexOf(subProtocol.identifier) >= 0) {
          const wallet = new AirGapMarketWallet(
            subProtocol.identifier,
            this.wallet.publicKey,
            this.wallet.isExtendedPublicKey,
            this.wallet.derivationPath
          )
          const exists = this.accountProvider.walletExists(wallet)
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

  public toggleAccount(account: IAccountWrapper) {
    account.selected = !account.selected
  }

  public addSubAccounts() {
    this.actionCallback({ subAccounts: this.subAccounts, accountProvider: this.accountProvider, location: this.location })
  }
}
