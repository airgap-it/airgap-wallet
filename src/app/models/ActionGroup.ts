import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Action, SimpleAction, LinkedAction } from 'airgap-coin-lib/dist/actions/Action'
import { ImportAccountAction } from 'airgap-coin-lib/dist/actions/GetKtAccountsAction'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

import { AccountTransactionListPage } from '../pages/account-transaction-list/account-transaction-list'
import { DataServiceKey } from '../services/data/data.service'
import { ProtocolSymbols } from '../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../services/sentry-error-handler/sentry-error-handler'

import { AddTokenAction, AddTokenActionContext } from './actions/AddTokenAction'
import { AirGapDelegateAction, AirGapDelegateActionContext } from './actions/DelegateAction'
import { AirGapGetKtAccountsAction } from './actions/GetKtAccountsAction'

export interface WalletActionInfo {
  name: string
  icon: string
}

export class ActionGroup {
  constructor(private readonly callerContext: AccountTransactionListPage) {}

  public getActions(): Action<any, any>[] {
    const actionMap: Map<string, () => Action<any, any>[]> = new Map()
    actionMap.set(ProtocolSymbols.XTZ, () => {
      return this.getTezosActions()
    })
    actionMap.set(ProtocolSymbols.XTZ_KT, () => {
      return this.getTezosKtActions()
    })
    actionMap.set(ProtocolSymbols.ETH, () => {
      return this.getEthereumActions()
    })

    const actionFunction: () => Action<any, any>[] | undefined = actionMap.get(this.callerContext.protocolIdentifier)

    return actionFunction ? actionFunction() : []
  }

  private getTezosActions(): Action<any, any>[] {
    const importAccountAction = new AirGapGetKtAccountsAction({ publicKey: this.callerContext.wallet.publicKey })

    importAccountAction.onComplete = async (ktAddresses: string[]): Promise<void> => {
      console.log('IMPORT ACCOUNT ACTION', ktAddresses)
      if (ktAddresses.length === 0) {
        this.callerContext.showToast('No accounts to import.')
      } else {
        for (const [index, ktAddress] of ktAddresses.entries()) {
          await this.callerContext.operationsProvider.addKtAddress(this.callerContext.wallet, index, ktAddresses)
        }

        this.callerContext.location.back()
        this.callerContext.showToast('Accounts imported')
      }
    }

    const prepareDelegateActionContext = new SimpleAction(
      new Promise<AirGapDelegateActionContext>(async resolve => {
        let wallet: AirGapMarketWallet = this.callerContext.wallet
        const importAction = new ImportAccountAction({ publicKey: this.callerContext.wallet.publicKey })
        try {
          await importAction.start()
          wallet = await this.callerContext.operationsProvider.addKtAddress(this.callerContext.wallet, 0, importAction.result)
        } catch {}
        const info = {
          wallet,
          actionCallback: resolve
        }
        this.callerContext.dataService.setData(DataServiceKey.DETAIL, info)
        this.callerContext.router
          .navigateByUrl('/delegation-baker-detail/' + DataServiceKey.DETAIL)
          .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
    )

    const delegateAction = new LinkedAction(prepareDelegateActionContext, AirGapDelegateAction)

    return [importAccountAction, delegateAction]
  }

  private getTezosKtActions(): Action<any, any>[] {
    const prepareDelegateActionContext = new SimpleAction(
      new Promise<AirGapDelegateActionContext>(async resolve => {
        const info = {
          wallet: this.callerContext.wallet,
          actionCallback: resolve
        }
        this.callerContext.dataService.setData(DataServiceKey.DETAIL, info)
        this.callerContext.router
          .navigateByUrl('/delegation-baker-detail/' + DataServiceKey.DETAIL)
          .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
    )

    const viewDelegationAction = new LinkedAction(prepareDelegateActionContext, AirGapDelegateAction)

    return [viewDelegationAction]
  }

  private getEthereumActions(): Action<any, any>[] {
    const prepareAddTokenActionContext = new SimpleAction(
      new Promise<AddTokenActionContext>(async resolve => {
        const info = {
          subProtocolType: SubProtocolType.TOKEN,
          wallet: this.callerContext.wallet,
          actionCallback: resolve
        }
        this.callerContext.dataService.setData(DataServiceKey.DETAIL, info)
        this.callerContext.router
          .navigateByUrl('/sub-account-add/' + DataServiceKey.DETAIL)
          .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
    )

    const addTokenAction = new LinkedAction(prepareAddTokenActionContext, AddTokenAction)
    addTokenAction.onComplete = async (): Promise<void> => {
      addTokenAction.getLinkedAction().context.location.back()
    }

    return [addTokenAction]
  }
}
