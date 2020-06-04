import { LedgerConnectionDetails, LedgerConnectionType } from '../LedgerConnection'
import { ElectronProcess } from 'src/app/models/ElectronProcess'

export enum LedgerProcessMessageType {
  GET_DEVICES = 'get-devices',
  GET_DEVICES_REPLY = 'get-devices-reply',

  OPEN = 'open',
  OPEN_REPLY = 'open-reply',

  SEND = 'send',
  SEND_REPLY = 'send-reply',

  EXCHANGE = 'exchange',
  EXCHANGE_REPLY = 'exchange-reply',

  SET_EXCHANGE_TIMEOUT = 'set-exchange-timeout',

  CLOSE = 'close',
  CLOSE_REPLY = 'close-reply',

  DECORATE_APP = 'decorate-app',
  SET_SCRAMBLE_KEY = 'set-scramble-key'
}

export interface GetDevicesMessage {
  connectionType: LedgerConnectionType
}
export interface GetDevicesMessageReply {
  devices: LedgerConnectionDetails[]
}

export interface OpenMessage {
  connectionType?: LedgerConnectionType
  descriptor?: string
}

export interface OpenMessageReply {
  transportId: string
}

export interface SendMessage {
  transportId: string
  cla: number
  ins: number
  p1: number
  p2: number
  hexData?: string
}

export interface SendMessageReply {
  response: Buffer | string
}

export interface ExchangeMessage {
  transportId: string
  apdu: string
}

export interface ExchangeMessageReply {
  response: Buffer | string
}

export interface SetExchangeTimeoutMessage {
  transportId: string
  timeout: number
}

export interface CloseMessage {
  transportId: string
}

export interface DecorateAppMessage {
  transportId: string
  self: Object
  methods: string[]
  scrambleKey: string
}

export interface SetScrambleKeyMessage {
  transportId: string
  key: string
}

export type LedgerProcessMessage<T extends LedgerProcessMessageType> = T extends LedgerProcessMessageType.GET_DEVICES
  ? GetDevicesMessage
  : T extends LedgerProcessMessageType.GET_DEVICES_REPLY
  ? GetDevicesMessageReply
  : T extends LedgerProcessMessageType.OPEN
  ? OpenMessage
  : T extends LedgerProcessMessageType.OPEN_REPLY
  ? OpenMessageReply
  : T extends LedgerProcessMessageType.SEND
  ? SendMessage
  : T extends LedgerProcessMessageType.SEND_REPLY
  ? SendMessageReply
  : T extends LedgerProcessMessageType.EXCHANGE
  ? ExchangeMessage
  : T extends LedgerProcessMessageType.EXCHANGE_REPLY
  ? ExchangeMessageReply
  : T extends LedgerProcessMessageType.SET_EXCHANGE_TIMEOUT
  ? SetExchangeTimeoutMessage
  : T extends LedgerProcessMessageType.CLOSE
  ? CloseMessage
  : T extends LedgerProcessMessageType.DECORATE_APP
  ? DecorateAppMessage
  : T extends LedgerProcessMessageType.SET_SCRAMBLE_KEY
  ? SetScrambleKeyMessage
  : never

export type LedgerProcessMessageReply<T extends LedgerProcessMessageType> = T extends LedgerProcessMessageType.GET_DEVICES
  ? LedgerProcessMessageType.GET_DEVICES_REPLY
  : T extends LedgerProcessMessageType.OPEN
  ? LedgerProcessMessageType.OPEN_REPLY
  : T extends LedgerProcessMessageType.SEND
  ? LedgerProcessMessageType.SEND_REPLY
  : T extends LedgerProcessMessageType.EXCHANGE
  ? LedgerProcessMessageType.EXCHANGE_REPLY
  : T extends LedgerProcessMessageType.CLOSE
  ? LedgerProcessMessageType.CLOSE_REPLY
  : never

const LEDGER_PROCESS_NAME = 'ledger'

export class LedgerElectronBridge {
  private static instance: LedgerElectronBridge | null = null

  public static getInstance(): LedgerElectronBridge {
    if (!LedgerElectronBridge.instance) {
      const electronProcess = new ElectronProcess(LEDGER_PROCESS_NAME)
      LedgerElectronBridge.instance = new LedgerElectronBridge(electronProcess)
    }
    return LedgerElectronBridge.instance
  }

  private readonly messagePromises: Map<string, Promise<any>> = new Map()

  private constructor(private electronProcess: ElectronProcess) {}

  public async sendToLedger<T extends LedgerProcessMessageType>(
    type: T,
    data?: LedgerProcessMessage<T>,
    requestId?: string
  ): Promise<LedgerProcessMessage<LedgerProcessMessageReply<T>>> {
    const promiseId = requestId ? `${type}_${requestId}` : type
    let promise = this.messagePromises.get(promiseId)
    if (!promise) {
      promise = this.electronProcess.send(promiseId, type, data).finally(() => this.messagePromises.delete(promiseId))
      this.messagePromises.set(promiseId, promise)
    }
    return promise
  }
}
