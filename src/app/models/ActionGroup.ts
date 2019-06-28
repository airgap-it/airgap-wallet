import { TezosKtProtocol } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

import { AccountTransactionListPage } from '../pages/account-transaction-list/account-transaction-list'
import { DataServiceKey } from '../services/data/data.service'
import { ProtocolSymbols } from '../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../services/sentry-error-handler/sentry-error-handler'

enum ActionState {
  READY,

  PREPARING,
  PREPARED,

  EXECUTING,
  EXECUTED,

  COMPLETING,
  COMPLETED,

  ERRORING,
  ERROR,

  CANCELLING,
  CANCELLED
}

interface ActionProgress<U> {
  percentage: number
  stage: string
  info: U
}

// tslint:disable:max-classes-per-file
export abstract class Action<T, U, V> {
  public readonly identifier: string = 'action'
  public info: { [key: string]: string | undefined } = {}

  public prepareFunction: () => Promise<T> = () => undefined
  public handlerFunction: (context: T) => Promise<V> = () => undefined
  public progressFunction: (progress: ActionProgress<U>) => Promise<void> = () => undefined
  public completeFunction: (result?: V) => Promise<void> = () => undefined
  public errorFunction: (error: Error) => Promise<void> = () => undefined
  public cancelFunction: () => Promise<void> = () => undefined

  private progress: ActionProgress<U> | undefined
  private state: ActionState = ActionState.READY

  public async perform(): Promise<V> {
    console.log(`${this.identifier}-PERFORM`)

    const context: T = await this.onPrepare()
    const result: V = await this.handler(context)
    await this.onComplete(result)

    return result
  }

  public async getState(): Promise<ActionState> {
    return this.state
  }

  public async getProgress(): Promise<ActionProgress<U> | undefined> {
    return this.progress
  }

  public async cancel(): Promise<void> {
    await this.onCancel()
  }

  protected async onPrepare(): Promise<T> {
    console.log(`${this.identifier}-ONPREPARE`)

    this.state = ActionState.PREPARING

    const context: T = await this.prepareFunction()

    this.state = ActionState.PREPARED

    return context
  }

  protected async handler(context: T): Promise<V> {
    console.log(`${this.identifier}-HANDLER`)

    this.state = ActionState.EXECUTING

    const result: V = await this.handlerFunction(context)

    this.state = ActionState.EXECUTED

    return result
  }

  protected async onProgress(progress: ActionProgress<U>): Promise<void> {
    console.log(`${this.identifier}-ONPROGRESS`)

    this.progress = progress

    return this.progressFunction(progress)
  }

  protected async onComplete(result?: V): Promise<void> {
    console.log(`${this.identifier}-ONCOMPLETE`)

    this.state = ActionState.COMPLETING

    await this.completeFunction(result)

    this.state = ActionState.COMPLETED
  }

  protected async onError(error: Error): Promise<void> {
    console.log(`${this.identifier}-ONERROR`)

    this.state = ActionState.ERRORING

    await this.errorFunction(error)

    this.state = ActionState.ERRORING
  }

  protected async onCancel(): Promise<void> {
    console.log(`${this.identifier}-ONPREPARE`)

    this.state = ActionState.CANCELLING

    await this.cancelFunction()

    this.state = ActionState.CANCELLED
  }
}

class AddTokenAction extends Action<any, any, any> {
  public readonly identifier: string = 'tezos-originate-action'
  public info = {
    name: 'account-transaction-list.add-tokens_label',
    icon: 'add'
  }
}

class ImportAccountAction extends Action<any, any, any> {
  public readonly identifier: string = 'tezos-import-account-action'
  public readonly info = {
    name: 'account-transaction-list.import-accounts_label',
    icon: 'add'
  }

  public readonly handlerFunction = async (context: any): Promise<string[]> => {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(context.publicKey)

    return ktAddresses
  }
}

class DelegateAction extends Action<any, any, any> {
  public readonly identifier: string = 'tezos-delegate-action'
  public readonly info = {
    name: 'account-transaction-list.delegate_label',
    icon: 'logo-usd'
  }

  public readonly handlerFunction = async (context: any): Promise<string[]> => {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(context.publicKey)

    return ktAddresses
  }
}

class ViewDelegationStatusAction extends Action<any, any, any> {
  public readonly identifier: string = 'tezos-delegate-action'
  public readonly info = {
    name: 'account-transaction-list.delegation-status_label',
    icon: 'md-information-circle'
  }

  public readonly handlerFunction = async (context: any): Promise<string[]> => {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(context.publicKey)

    return ktAddresses
  }
}

export class ActionGroup {
  constructor(private readonly callerContext: AccountTransactionListPage) {}

  public getActions(): any[] {
    if (this.callerContext.protocolIdentifier === ProtocolSymbols.XTZ) {
      return this.getTezosActions()
    } else if (this.callerContext.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      return this.getTezosKtActions()
    } else if (this.callerContext.protocolIdentifier === ProtocolSymbols.ETH) {
      return this.getEthereumActions()
    }

    return []
  }

  private getTezosActions(): any[] {
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

  private getTezosKtActions(): any[] {
    const viewDelegationStatusAction: ViewDelegationStatusAction = new ViewDelegationStatusAction()

    viewDelegationStatusAction.prepareFunction = async (): Promise<any> => {
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

    return [viewDelegationStatusAction]
  }

  private getEthereumActions(): any[] {
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
