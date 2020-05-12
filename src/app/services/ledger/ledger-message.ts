import { AirGapMarketWallet } from 'airgap-coin-lib'
import { LedgerConnection } from './ledger-connection'

export enum LedgerProcessMessageType {
  GET_DEVICES_USB = 'get-devices-usb',
  GET_DEVICES_USB_REPLY = 'get-devices-usb-reply',

  GET_DEVICES_BLE = 'get-devices-ble',
  GET_DEVICES_BLE_REPLY = 'get-devices-ble-reply',

  IMPORT_WALLET = 'import-wallet',
  IMPORT_WALLET_REPLY = 'import-wallet-reply',

  SIGN_TRANSACTION = 'sign-transaction',
  SIGN_TRANSACTION_REPLY = 'sign-transaction-reply'
}

interface AppMessage {
  protocolIdentifier: string
  ledgerConnection: LedgerConnection
}

interface GetDevicesMessageReply {
  devices: LedgerConnection[]
}

interface ImportWalletAppMessage extends AppMessage {}
interface ImportWalletAppMessageReply extends AppMessage {
  wallet: AirGapMarketWallet
}

interface SignTransactionAppMessage extends AppMessage {
  transaction: any
}

interface SignTransactionAppMessageReply extends AppMessage {
  signedTransaction: string
}

export type LedgerProcessMessage<T extends LedgerProcessMessageType> = T extends LedgerProcessMessageType.GET_DEVICES_USB
  ? never
  : T extends LedgerProcessMessageType.GET_DEVICES_USB_REPLY
  ? GetDevicesMessageReply
  : T extends LedgerProcessMessageType.GET_DEVICES_BLE
  ? never
  : T extends LedgerProcessMessageType.GET_DEVICES_BLE_REPLY
  ? GetDevicesMessageReply
  : T extends LedgerProcessMessageType.IMPORT_WALLET
  ? ImportWalletAppMessage
  : T extends LedgerProcessMessageType.IMPORT_WALLET_REPLY
  ? ImportWalletAppMessageReply
  : T extends LedgerProcessMessageType.SIGN_TRANSACTION
  ? SignTransactionAppMessage
  : T extends LedgerProcessMessageType.SIGN_TRANSACTION_REPLY
  ? SignTransactionAppMessageReply
  : never

export type LedgerProcessMessageReply<T extends LedgerProcessMessageType> = T extends LedgerProcessMessageType.GET_DEVICES_USB
  ? LedgerProcessMessageType.GET_DEVICES_BLE_REPLY
  : T extends LedgerProcessMessageType.GET_DEVICES_BLE
  ? LedgerProcessMessageType.GET_DEVICES_BLE_REPLY
  : T extends LedgerProcessMessageType.IMPORT_WALLET
  ? LedgerProcessMessageType.IMPORT_WALLET_REPLY
  : T extends LedgerProcessMessageType.SIGN_TRANSACTION
  ? LedgerProcessMessageType.SIGN_TRANSACTION_REPLY
  : never
