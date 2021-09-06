// tslint:disable: max-classes-per-file
import Transport from '@ledgerhq/hw-transport'
import { DeviceModel } from '@ledgerhq/hw-transport/node_modules/@ledgerhq/devices'
import { EventEmitter } from 'events'

import {
  ExchangeMessageReply,
  GetDevicesMessageReply,
  LedgerElectronBridge,
  LedgerProcessMessageType,
  OpenMessageReply,
  SendMessageReply
} from './bridge/LedgerElectronBridge'
import { LedgerConnection, LedgerConnectionDetails, LedgerConnectionType } from './LedgerConnection'

class TransportElectron implements Transport {
  exchangeTimeout = 30000
  unresponsiveTimeout = 15000
  deviceModel: DeviceModel | null | undefined = null
  _events = new EventEmitter()
  _appAPIlock: string | null = null

  constructor(private readonly id: string, private readonly bridge: LedgerElectronBridge) {}

  public async send(cla: number, ins: number, p1: number, p2: number, data?: Buffer, _statusList?: readonly number[]): Promise<Buffer> {
    const { response }: SendMessageReply = await this.bridge.sendToLedger(
      LedgerProcessMessageType.SEND,
      {
        transportId: this.id,
        cla,
        ins,
        p1,
        p2,
        hexData: data ? data.toString('hex') : undefined
      },
      `${this.id}_${cla}_${ins}_${new Date().getTime().toString()}`
    )

    return Buffer.isBuffer(response) ? response : Buffer.from(response, 'hex')
  }

  public async close(): Promise<void> {
    await this.bridge.sendToLedger(
      LedgerProcessMessageType.CLOSE,
      {
        transportId: this.id
      },
      this.id
    )
  }

  public async decorateAppAPIMethods(self: any, methods: string[], scrambleKey: string): Promise<void> {
    return this.bridge.sendToLedger(
      LedgerProcessMessageType.DECORATE_APP,
      {
        transportId: this.id,
        self,
        methods,
        scrambleKey
      },
      `${this.id}_decorateAppAPIMethods_${new Date().getTime().toString()}`
    )
  }

  public async setScrambleKey(key: string): Promise<void> {
    return this.bridge.sendToLedger(
      LedgerProcessMessageType.SET_SCRAMBLE_KEY,
      {
        transportId: this.id,
        key
      },
      `${this.id}_setScrambleKey_${new Date().getTime().toString()}`
    )
  }

  public async exchange(apdu: Buffer): Promise<Buffer> {
    const { response }: ExchangeMessageReply = await this.bridge.sendToLedger(
      LedgerProcessMessageType.EXCHANGE,
      {
        transportId: this.id,
        apdu: apdu.toString('hex')
      },
      `${this.id}_exchange_${new Date().getTime().toString()}`
    )

    return Buffer.isBuffer(response) ? response : Buffer.from(response, 'hex')
  }

  public async setExchangeTimeout(exchangeTimeout: number): Promise<void> {
    return this.bridge.sendToLedger(
      LedgerProcessMessageType.SET_EXCHANGE_TIMEOUT,
      {
        transportId: this.id,
        timeout: exchangeTimeout
      },
      `${this.id}_setExchangeTimeout_${new Date().getTime().toString()}`
    )
  }

  public on(_eventName: string, _cb: any): void {
    // not needed
    throw new Error('Method not implemented.')
  }

  public off(_eventName: string, _cb: any): void {
    // not needed
    throw new Error('Method not implemented.')
  }

  public emit(event: string, ...args: any): void {
    this._events.emit(event, ...args)
  }

  public setDebugMode(): void {
    // not needed
    throw new Error('Method not implemented.')
  }
  public setExchangeUnresponsiveTimeout(unresponsiveTimeout: number): void {
    this.unresponsiveTimeout = unresponsiveTimeout
  }
  public exchangeBusyPromise: Promise<void> | null | undefined

  public exchangeAtomicImpl = async (_f: () => Promise<Buffer | void>): Promise<Buffer | void> => {
    throw new Error('Method not implemented.')
  }

  public decorateAppAPIMethod<R, A extends any[]>(
    _methodName: string,
    _f: (...args: A) => Promise<R>,
    _ctx: any,
    _scrambleKey: string
  ): (...args: A) => Promise<R> {
    throw new Error('Method not implemented.')
  }
}

export class LedgerConnectionElectron implements LedgerConnection {
  private static get bridge(): LedgerElectronBridge {
    return LedgerElectronBridge.getInstance()
  }

  public static async getConnectedDevices(connectionType: LedgerConnectionType): Promise<LedgerConnectionDetails[]> {
    const { devices }: GetDevicesMessageReply = await LedgerConnectionElectron.bridge.sendToLedger(
      LedgerProcessMessageType.GET_DEVICES,
      {
        connectionType
      },
      connectionType
    )

    return devices
  }

  public static async open(connectionType?: LedgerConnectionType, descriptor?: string): Promise<LedgerConnectionElectron> {
    const { transportId }: OpenMessageReply = await LedgerConnectionElectron.bridge.sendToLedger(
      LedgerProcessMessageType.OPEN,
      {
        connectionType,
        descriptor
      },
      `${connectionType}_${descriptor}`
    )

    const transport = new TransportElectron(transportId, LedgerConnectionElectron.bridge)

    return new LedgerConnectionElectron(connectionType, transport)
  }

  private constructor(readonly type: LedgerConnectionType, readonly transport: TransportElectron) {}
}
