import { Injectable } from '@angular/core'

import { AirGapMarketWallet } from 'airgap-coin-lib'

import { ElectronProcessService } from '../electron-process/electron-process-service'
import { LedgerConnection } from './ledger-connection'
import { LedgerProcessMessageType, LedgerProcessMessage, LedgerProcessMessageReply } from './ledger-message'

// TODO: provide path
const ledgerProcess = {
  name: 'ledger',
  path: ''
}

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private messagePromises: Map<string, Promise<any>> = new Map()

  constructor(private readonly processService: ElectronProcessService) {}

  public async getConnectedDevices(): Promise<LedgerConnection[]> {
    const messageReplies = await Promise.all([
      this.sendToLedgerApp(LedgerProcessMessageType.GET_DEVICES_USB),
      this.sendToLedgerApp(LedgerProcessMessageType.GET_DEVICES_BLE)
    ])

    return messageReplies.map(reply => reply.devices).reduce((flatten, toFlatten) => flatten.concat(toFlatten), [])
  }

  public async importWallet(identifier: string, ledgerConnection: LedgerConnection): Promise<AirGapMarketWallet> {
    const requestId = `${identifier}_${ledgerConnection.id}`
    const { wallet } = await this.sendToLedgerApp(
      LedgerProcessMessageType.IMPORT_WALLET,
      {
        protocolIdentifier: identifier,
        ledgerConnection
      },
      requestId
    )

    return wallet
  }

  public async signTransaction(identifier: string, ledgerConnection: LedgerConnection, transaction: any): Promise<string> {
    const requestId = `${identifier}_${ledgerConnection.id}_${new Date().getTime().toString()}`
    const { signedTransaction } = await this.sendToLedgerApp(
      LedgerProcessMessageType.SIGN_TRANSACTION,
      {
        protocolIdentifier: identifier,
        ledgerConnection,
        transaction
      },
      requestId
    )

    return signedTransaction
  }

  private async sendToLedgerApp<T extends LedgerProcessMessageType>(
    type: T,
    data?: LedgerProcessMessage<T>,
    requestId?: string
  ): Promise<LedgerProcessMessage<LedgerProcessMessageReply<T>>> {
    const promiseId = requestId ? `${type}_${requestId}` : type
    let promise = this.messagePromises.get(promiseId)
    if (!promise) {
      promise = this.processService.sendToProcess(ledgerProcess, promiseId, {
        type,
        ...(data ? data : {})
      })
      this.messagePromises.set(promiseId, promise)
    }
    return promise
  }
}
