import { Injectable } from '@angular/core'
import { ChildProcess } from 'child_process'

import { AirGapMarketWallet } from 'airgap-coin-lib'

import { ElectronProcessService } from '../electron-process/electron-process-service'
import { LedgerConnection } from './ledger-connection'
import { LedgerProcessMessageType, LedgerProcessMessage, LedgerProcessMessageReply } from './ledger-message'
import { Deferred } from 'src/app/helpers/promise'

const LEDGER_PROCESS = 'ledger'

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private ledgerProcess: ChildProcess | null = null
  private messageDeferred: Map<string, Deferred<any>> = new Map()

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
    if (!this.ledgerProcess) {
      // TODO: provide process path
      this.ledgerProcess = await this.processService.spawnProcess(LEDGER_PROCESS, '')
      this.ledgerProcess.on('message', message => this.onLedgerProcessMessage(message.promiseId, message.data))
    }

    const deferredId = requestId ? `${type}_${requestId}` : type
    const deferred = new Deferred<LedgerProcessMessage<LedgerProcessMessageReply<T>>>()
    this.messageDeferred.set(deferredId, deferred)

    this.ledgerProcess.send({
      type,
      deferredId,
      data
    })

    return deferred.promise
  }

  private onLedgerProcessMessage<T extends LedgerProcessMessageType>(promiseId: string, message: LedgerProcessMessage<T>) {
    console.log('message received', message)
    const deferred = this.messageDeferred.get(promiseId)
    if (deferred) {
      deferred.resolve(message)
    }
  }
}
