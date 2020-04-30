import { LedgerApp } from '../LedgerApp'
import { AirGapMarketWallet, SubstrateProtocol } from 'airgap-coin-lib'
import { RawSubstrateTransaction } from 'airgap-coin-lib/dist/serializer/types'
import { SubstrateTransaction } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateTransaction'
import {
  SubstrateSignature,
  SubstrateSignatureType
} from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateSignature'
import { SubstrateTransactionPayload } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateTransactionPayload'

enum Instruction {
  /*
   * Command:
   * 1 byte - application ID
   * 1 byte - instruction ID
   * 1 byte - [ignored]
   * 1 byte - [ignored]
   * 1 byte - bytes in payload (0)
   */
  GET_VERSION = 0x00,
  /*
   * Command:
   * 1 byte      - application ID
   * 1 byte      - instruction ID
   * 1 byte      - request user confirmation (NO = 0)
   * 1 byte      - [ignored]
   * 1 byte      - bytes in payload
   * 4 bytes x 5 - derivation path chunks
   */
  GET_ADDRESS = 0x01,
  /*
   * Command:
   * 1 byte  - application ID
   * 1 byte  - instruction ID
   * 1 byte  - payload descriptor (INIT = 0, ADD = 1, LAST = 2)
   * 1 byte  - [ignored]
   * 1 byte  - bytes in payload
   * ? bytes - INIT ? derivation path chunks : message
   */
  SIGN = 0x02
}

enum ReturnCode {
  EXECUTION_ERROR = 0x6400,
  EMPTY_BUFFER = 0x6982,
  OUTPUT_TOO_SMALL = 0x6983,
  NOT_ALLOWED = 0x6986,
  INSTRUCTION_NOT_SUPPORTED = 0x6d00,
  APP_NOT_SUPPORTED = 0x6e00,
  UNKNOWN = 0x6f00,
  SUCCESS = 0x9000
}

enum RequiresConfirmation {
  NO = 0,
  YES = 1
}

enum PayloadDescriptor {
  INIT = 0,
  ADD = 1,
  LAST = 2
}

const MAX_PAYLOAD_SIZE = 255

export abstract class SubstrateLedgerApp extends LedgerApp {
  public appIdentifier: number = 0x99

  protected abstract protocol: SubstrateProtocol

  public async isAvailable(): Promise<boolean> {
    try {
      /*
       * Reponse:
       * 1 byte  - test mode
       * 2 bytes - version major
       * 2 bytes - version minor
       * 2 bytes - version patch
       * 1 byte  - device is locked
       * 2 bytes - return code
       */
      const response = await this.transport.send(this.appIdentifier, Instruction.GET_VERSION, 0, 0, this.createPayload(null))
      return response.readUInt16BE(8) === ReturnCode.SUCCESS
    } catch {
      return false
    }
  }

  public async importWallet(): Promise<AirGapMarketWallet> {
    const derivationPath = this.derivationPathToBuffer(this.protocol.standardDerivationPath)
    /*
     * Reponse:
     * 32 bytes - public key
     * ? bytes  - address
     * 2 bytes  - return code
     */
    const response = await this.transport.send(
      this.appIdentifier,
      Instruction.GET_ADDRESS,
      RequiresConfirmation.NO,
      0,
      this.createPayload(derivationPath)
    )

    const publicKey = response.slice(0, 32).toString('hex')

    return new AirGapMarketWallet(this.protocol.identifier, publicKey, false, this.protocol.standardDerivationPath)
  }

  public async signTranscation(transaction: RawSubstrateTransaction): Promise<string> {
    const txs = this.protocol.transactionController.decodeDetails(transaction.encoded)
    const promises = txs.map(tx => this.signSubstrateTransaction(tx.transaction, tx.payload))

    const signed = []
    for (let promise of promises) {
      signed.push(await promise)
    }

    txs.forEach((tx, index) => (tx.transaction = signed[index]))
    return this.protocol.transactionController.encodeDetails(txs)
  }

  private async signSubstrateTransaction(
    transaction: SubstrateTransaction,
    payload: SubstrateTransactionPayload
  ): Promise<SubstrateTransaction> {
    /*
     * Reponse:
     * 65 bytes - signature
     * 2 bytes  - return code
     */
    const response = await this.signMessage(Buffer.from(payload.encode(), 'hex'))
    const returnCode = response.readUInt16BE(65)

    if (returnCode !== ReturnCode.SUCCESS) {
      throw new Error(`Signing transaction failed with error code ${returnCode}.`)
    }

    const signatureType = SubstrateSignatureType[SubstrateSignatureType[response.readUInt8(0)]]
    const signatureBuffer = response.slice(1, 64)

    const signature = SubstrateSignature.create(signatureType, signatureBuffer)

    return SubstrateTransaction.fromTransaction(transaction, { signature })
  }

  private async signMessage(message: Buffer): Promise<Buffer> {
    const derivationPath = this.derivationPathToBuffer(this.protocol.standardDerivationPath)

    const chunks = [derivationPath]
    for (let offset = 0; offset < message.length; offset += MAX_PAYLOAD_SIZE) {
      const end = offset + MAX_PAYLOAD_SIZE
      chunks.push(message.slice(offset, end < message.length ? end : message.length))
    }

    function getDescriptor(index: number): PayloadDescriptor {
      if (index === 0) {
        return PayloadDescriptor.INIT
      } else if (index < chunks.length) {
        return PayloadDescriptor.ADD
      } else {
        return PayloadDescriptor.LAST
      }
    }

    let response: Buffer
    for (let i = 0; i < chunks.length; i++) {
      response = await this.signSendPayloadChunk(chunks[i], getDescriptor(i))
    }

    return response
  }

  private async signSendPayloadChunk(chunk: Buffer, descriptor: PayloadDescriptor): Promise<Buffer> {
    const response = await this.transport.send(this.appIdentifier, Instruction.SIGN, descriptor, 0, this.createPayload(chunk))

    const returnCode = response.slice(0, -2)
    if (returnCode.readUInt16BE(0) === ReturnCode.SUCCESS) {
      throw new Error(`Sending initial data to SIGN failed with error code ${returnCode}.`)
    }

    return response
  }
}
