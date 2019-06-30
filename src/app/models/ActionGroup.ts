import { AirGapMarketWallet, TezosKtProtocol } from 'airgap-coin-lib'
import { Action, ActionInfo } from 'airgap-coin-lib/dist/actions/Action'
import { DelegateActionContext } from 'airgap-coin-lib/dist/actions/DelegateAction'
import { ImportAccoutActionContext } from 'airgap-coin-lib/dist/actions/GetKtAccountsAction'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

import { AccountTransactionListPage } from '../pages/account-transaction-list/account-transaction-list'
import { DataServiceKey } from '../services/data/data.service'
import { ProtocolSymbols } from '../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../services/sentry-error-handler/sentry-error-handler'

import { AddTokenAction, AddTokenActionContext } from './actions/AddTokenAction'
import { AirGapDelegateAction, DelegateActionEnvironment } from './actions/DelegateAction'
import { AirGapGetKtAccountsAction } from './actions/GetKtAccountsAction'

export interface WalletActionInfo extends ActionInfo {
  name: string
  icon: string
}

export class ActionGroup {
  constructor(private readonly callerContext: AccountTransactionListPage) {}

  public getActions(): Action<any, any, any>[] {
    const actionMap: Map<string, () => Action<any, any, any>[]> = new Map()
    actionMap.set(ProtocolSymbols.XTZ, () => {
      return this.getTezosActions()
    })
    actionMap.set(ProtocolSymbols.XTZ_KT, () => {
      return this.getTezosKtActions()
    })
    actionMap.set(ProtocolSymbols.ETH, () => {
      return this.getEthereumActions()
    })

    const actionFunction: () => Action<any, any, any>[] | undefined = actionMap.get(this.callerContext.protocolIdentifier)

    return actionFunction ? actionFunction() : []
  }

  private getTezosActions(): Action<any, any, any>[] {
    const importAccountAction: AirGapGetKtAccountsAction = new AirGapGetKtAccountsAction({ publicKey: this.callerContext.wallet.publicKey })

    importAccountAction.completeFunction = async (context: ImportAccoutActionContext, ktAddresses: string[]): Promise<void> => {
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

    const delegateAction: AirGapDelegateAction = new AirGapDelegateAction()

    delegateAction.prepareFunction = async (): Promise<DelegateActionContext<DelegateActionEnvironment>> => {
      return new Promise<DelegateActionContext<DelegateActionEnvironment>>(async resolve => {
        const protocol: TezosKtProtocol = new TezosKtProtocol()
        const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(this.callerContext.wallet.publicKey)

        let wallet: AirGapMarketWallet = this.callerContext.wallet
        if (ktAddresses) {
          wallet = await this.callerContext.operationsProvider.addKtAddress(this.callerContext.wallet, 0, ktAddresses)
        }

        const info = {
          wallet,
          actionCallback: resolve
        }
        this.callerContext.dataService.setData(DataServiceKey.DETAIL, info)
        this.callerContext.router
          .navigateByUrl('/delegation-baker-detail/' + DataServiceKey.DETAIL)
          .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
    }

    return [importAccountAction, delegateAction]
  }

  private getTezosKtActions(): Action<any, any, any>[] {
    const viewDelegationAction: AirGapDelegateAction = new AirGapDelegateAction()

    viewDelegationAction.prepareFunction = async (): Promise<any> => {
      return new Promise(resolve => {
        const info = {
          wallet: this.callerContext.wallet,
          actionCallback: resolve
        }
        this.callerContext.dataService.setData(DataServiceKey.DETAIL, info)
        this.callerContext.router
          .navigateByUrl('/delegation-baker-detail/' + DataServiceKey.DETAIL)
          .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
    }

    return [viewDelegationAction]
  }

  private getEthereumActions(): Action<AddTokenActionContext, any, any>[] {
    const addTokenAction: AddTokenAction = new AddTokenAction()

    addTokenAction.prepareFunction = async (): Promise<any> => {
      return new Promise(resolve => {
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
    }

    addTokenAction.completeFunction = async (context: AddTokenActionContext): Promise<void> => {
      context.location.back()
    }

    return [addTokenAction]
  }
}
