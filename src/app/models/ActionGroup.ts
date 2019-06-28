import { TezosKtProtocol } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

import { AccountTransactionListPage } from '../pages/account-transaction-list/account-transaction-list'
import { DataServiceKey } from '../services/data/data.service'
import { ProtocolSymbols } from '../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../services/sentry-error-handler/sentry-error-handler'

import { Action } from './Action'
import { AddTokenAction } from './actions/add-token-action'
import { DelegateAction } from './actions/delegate-action'
import { ImportAccountAction } from './actions/import-account-action'
import { ViewDelegationAction } from './actions/view-delegation-action'

// tslint:disable:max-classes-per-file

export class ActionGroup {
  constructor(private readonly callerContext: AccountTransactionListPage) {}

  public getActions(): Action<any, any, any>[] {
    if (this.callerContext.protocolIdentifier === ProtocolSymbols.XTZ) {
      return this.getTezosActions()
    } else if (this.callerContext.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      return this.getTezosKtActions()
    } else if (this.callerContext.protocolIdentifier === ProtocolSymbols.ETH) {
      return this.getEthereumActions()
    }

    return []
  }

  private getTezosActions(): Action<any, any, any>[] {
    const importAccountAction: ImportAccountAction = new ImportAccountAction()

    importAccountAction.prepareFunction = async (): Promise<any> => {
      return { publicKey: this.callerContext.wallet.publicKey }
    }

    importAccountAction.completeFunction = async (ktAddresses: string[]): Promise<void> => {
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

    const delegateAction: DelegateAction = new DelegateAction()

    delegateAction.prepareFunction = async (): Promise<any> => {
      return new Promise(async resolve => {
        const protocol = new TezosKtProtocol()
        const ktAddresses = await protocol.getAddressesFromPublicKey(this.callerContext.wallet.publicKey)

        let wallet = this.callerContext.wallet
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
    const viewDelegationAction: ViewDelegationAction = new ViewDelegationAction()

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

  private getEthereumActions(): Action<any, any, any>[] {
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

    return [addTokenAction]
  }
}
