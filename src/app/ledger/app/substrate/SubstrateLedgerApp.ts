import { LedgerApp } from '../LedgerApp'
import { AirGapMarketWallet, SubstrateProtocol } from 'airgap-coin-lib'
import { RawSubstrateTransaction } from 'airgap-coin-lib/dist/serializer/types'
import { SubstrateTransaction } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateTransaction'
import {
  SubstrateSignature,
  SubstrateSignatureType
} from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateSignature'
import { SubstrateTransactionPayload } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateTransactionPayload'
import { Buffer } from 'buffer'
import { ReturnCode } from '../../ReturnCode'
import { isType } from 'src/app/utils/utils'

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
  GET_ADDRESS_ED25519 = 0x01,
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
  protected readonly appIdentifier: number = 0x99
  protected abstract readonly scrambleKey: string

  protected abstract readonly protocol: SubstrateProtocol

  public init(): void {
    this.connection.transport.decorateAppAPIMethods(this, ['importWallet', 'signTransaction'], this.scrambleKey)
  }

  public async importWallet(): Promise<AirGapMarketWallet> {
    const derivationPath = this.derivationPathToBuffer(this.protocol.standardDerivationPath)

    try {
      /*
       * Reponse:
       * 32 bytes - public key
       * ? bytes  - address
       * 2 bytes  - return code
       */
      const response: Buffer = await this.connection.transport.send(
        this.appIdentifier,
        Instruction.GET_ADDRESS_ED25519,
        RequiresConfirmation.YES,
        0,
        derivationPath
      )

      const publicKey: string = response.slice(0, 32).toString('hex')

      return new AirGapMarketWallet(this.protocol.identifier, publicKey, false, this.protocol.standardDerivationPath)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async signTransaction(transaction: RawSubstrateTransaction): Promise<string> {
    const txs = this.protocol.transactionController.decodeDetails(transaction.encoded)
    const signed = await Promise.all(txs.map(tx => this.signSubstrateTransaction(tx.transaction, tx.payload)))

    if (signed.some(tx => tx === null)) {
      return Promise.reject('Rejected')
    }

    txs.forEach((tx, index) => (tx.transaction = signed[index]))

    return this.protocol.transactionController.encodeDetails(txs)
  }

  private async signSubstrateTransaction(
    transaction: SubstrateTransaction,
    payload: SubstrateTransactionPayload
  ): Promise<SubstrateTransaction | null> {
    try {
      /*
       * Reponse:
       * 65 bytes - signature
       * 2 bytes  - return code
       */
      const response = await this.signMessage(Buffer.from(payload.encode(), 'hex'))
      const returnCode = response.readUInt16BE(response.length - 2)

      if (returnCode !== ReturnCode.SUCCESS) {
        throw new Error(`Signing transaction failed with error code ${returnCode}.`)
      }

      const signatureType = SubstrateSignatureType[SubstrateSignatureType[response.readUInt8(0)]]
      const signatureBuffer = response.slice(1, 65)

      const signature = SubstrateSignature.create(signatureType, signatureBuffer)

      return SubstrateTransaction.fromTransaction(transaction, { signature })
    } catch (error) {
      if (isType<{ statusCode: number }>(error, 'statusCode')) {
        switch (error.statusCode) {
          case ReturnCode.COMMAND_NOT_ALLOWED: // thrown when operation rejected
            return null
        }
      }
      return Promise.reject(error)
    }
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
      } else if (index < chunks.length - 1) {
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
    const response = await this.connection.transport.send(this.appIdentifier, Instruction.SIGN, descriptor, 0, chunk)

    const returnCode = response.slice(-2)
    if (returnCode.readUInt16BE(0) !== ReturnCode.SUCCESS) {
      throw new Error(
        `Sending data to SIGN failed with error code 0x${returnCode.toString('hex')}. (descriptor: ${PayloadDescriptor[descriptor]})`
      )
    }

    return response
  }
}
