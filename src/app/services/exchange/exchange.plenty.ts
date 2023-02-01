// tslint:disable: max-classes-per-file
import { ProtocolService } from '@airgap/angular-core'
import {
  AirGapMarketWallet,
  FeeDefaults,
  ICoinProtocol,
  isProtocolSymbol,
  MainProtocolSymbols,
  SubProtocolSymbols,
  ProtocolSymbols
} from '@airgap/coinlib-core'
import { AirGapTransactionStatus, IAirGapTransaction } from '@airgap/coinlib-core/interfaces/IAirGapTransaction'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { Store } from '@ngrx/store'
import { Schema } from '@taquito/michelson-encoder'
import { Contract, TezosToolkit, TransferParams } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { UIOptionButtonGroup } from '../../models/widgets/input/UIOptionButtonGroup'
import { UIWidget } from '../../models/widgets/UIWidget'
import { Exchange, ExchangeIdentifier, ExchangeTransaction, ExchangeTransactionStatusResponse, ExchangeUI } from './exchange.interface'
import * as fromRoot from '../../app.reducers'
import { getSelectedSlippage } from 'src/app/app.selectors'
import { TezosOperation } from '@airgap/tezos/v0/protocol/types/operations/TezosOperation'
import { TezosTransactionOperation, TezosTransactionParameters } from '@airgap/tezos/v0/protocol/types/operations/Transaction'
import { RawTezosTransaction, TezosProtocol, TezosWrappedOperation } from '@airgap/tezos'
import { TezosAddressResult } from '@airgap/tezos/v0/protocol/types/TezosAddressResult'
import { TezosOperationType } from '@airgap/tezos/v0/protocol/types/TezosOperationType'

interface DexStorage {
  token1_pool: number
  token2_pool: number

  token1Address: string
  token2Address: string
  token1Id: number
  token2Id: number
}

type PartialTransactionOperation = TezosOperation & Partial<TezosTransactionOperation>

interface PlentyTransaction {
  details: IAirGapTransaction[]
  unsigned: RawTezosTransaction
}

interface PlentySlippageTolerance {
  low: number
  medium: number
  high: number
}

class PlentyTransactionStatusResponse implements ExchangeTransactionStatusResponse {
  constructor(public readonly status: string) { }

  public isPending(): boolean {
    switch (this.status) {
      case 'applied':
      case 'failed':
        return false
      default:
        return true
    }
  }
}

const NODE_URL: string = 'https://tezos-node.prod.gke.papers.tech'

const PLENTY_FEE: number = 0.0035 // 0.35%

enum ControlId {
  SLIPPAGE_TOLERANCE = 'slippageTolerance',
  SLIPPAGE_TOLERANCE_CONTROL = 'slippageToleranceControl'
}

const DEX_CONTRACTS = {
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_USD}`]: 'KT1D36ZG99YuhoCRZXLL86tQYAbv36bCq9XM',
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_ETHTZ}`]: 'KT1AbuUaPQmYLsB8n8FdSzBrxvrsm8ctwW1V',
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_KUSD}`]: 'KT1UNBvCJXiwJY6tmHM7CJUVwNPew53XkSfh',
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_QUIPU}`]: 'KT1NtsnKQ1c3rYB12ZToP77XaJs8WDBvF221',
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_BTC}`]: 'KT1HaDP8fRW7kavK2beST7o4RvzuvZbn5VwV',
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_UUSD}`]: 'KT1Cba383ZJpEearqnUyUKUMsgu5Z3TXBgeH',
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_YOU}`]: 'KT1EM6NjJdJXmz3Pj13pfu3MWVDwXEQnoH3N',
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_CTEZ}`]: 'KT1C9gJRfkpPbNdBn3XyYbrUHT6XgfPzZqXP',
  [`${SubProtocolSymbols.XTZ_PLENTY}/${SubProtocolSymbols.XTZ_WRAP}`]: 'KT1C2SXoGcje3VVMJHKRVhYXuWuNmv5ztJcw',
  [`${SubProtocolSymbols.XTZ_UUSD}/${SubProtocolSymbols.XTZ_YOU}`]: 'KT1TnrLFrdemNZ1AnnWNfi21rXg7eknS484C',
  [`${SubProtocolSymbols.XTZ_UUSD}/${SubProtocolSymbols.XTZ_UDEFI}`]: 'KT1EAw8hL5zseB3SLpJhBqPQfP9aWrWh8iMW',
  [`${SubProtocolSymbols.XTZ_KUSD}/${SubProtocolSymbols.XTZ_USD}`]: 'KT1TnsQ6JqzyTz5PHMsGj28WwJyBtgc146aJ',
  [`${SubProtocolSymbols.XTZ_CTEZ}/${SubProtocolSymbols.XTZ_WRAP}`]: 'KT19Qe4KbEVAiaVeNsgo9Tkqa6qvZho8c4W5',
  [`${SubProtocolSymbols.XTZ_CTEZ}/${SubProtocolSymbols.XTZ_UUSD}`]: 'KT1Rx3pQzsn4FBuuYhcWsqUS7vWFx3ktqSWD',
  [`${SubProtocolSymbols.XTZ_CTEZ}/${SubProtocolSymbols.XTZ_QUIPU}`]: 'KT1Ss8rb1UFVqG2LYEU5g4NEbK5SqW5Xadwp',
  [`${SubProtocolSymbols.XTZ_CTEZ}/${SubProtocolSymbols.XTZ_ETHTZ}`]: 'KT1GSYhwanehtwCK3NPfkMFbD1bNQmvosbqL',
  [`${SubProtocolSymbols.XTZ_CTEZ}/${SubProtocolSymbols.XTZ_KUSD}`]: 'KT1X1nkqJDR1UHwbfpcnME5Z7agJLjUQNguB',
  [`${SubProtocolSymbols.XTZ_CTEZ}/${SubProtocolSymbols.XTZ_USD}`]: 'KT1PWAXfPatPWBNJUxTHin4ECin1kYJHHnsr'
}

const FA1p2_ENTRYPOINTS = {
  approve: 'approve'
}

const FA2_ENTRYPOINTS = {
  updateOperators: 'update_operators'
}

const DEX_ENTRYPOINTS = {
  tezToTokenPayment: 'tezToTokenPayment',
  tokenToTezPayment: 'tokenToTezPayment',
  swap: 'Swap'
}

export class PlentyExchange implements Exchange {
  private readonly identifierExchangeToAirGapMap: Map<ExchangeIdentifier, ProtocolSymbols> = new Map<ExchangeIdentifier, ProtocolSymbols>()
  private readonly identifierAirGapToExchangeMap: Map<ProtocolSymbols, ExchangeIdentifier> = new Map<ProtocolSymbols, ExchangeIdentifier>()

  private readonly dexContracts: Map<string, Contract> = new Map<ProtocolSymbols, Contract>()

  private readonly supportedTokens: ProtocolSymbols[] = [
    SubProtocolSymbols.XTZ_PLENTY,
    SubProtocolSymbols.XTZ_UUSD,
    SubProtocolSymbols.XTZ_YOU,
    SubProtocolSymbols.XTZ_UDEFI,
    SubProtocolSymbols.XTZ_CTEZ,
    SubProtocolSymbols.XTZ_KUSD,
    SubProtocolSymbols.XTZ_USD,
    SubProtocolSymbols.XTZ_ETHTZ,
    SubProtocolSymbols.XTZ_QUIPU,
    SubProtocolSymbols.XTZ_BTC,
  ]

  private get supportedFromCurrencies(): ProtocolSymbols[] {
    return this.supportedTokens
  }

  private readonly tezos: TezosToolkit = new TezosToolkit(NODE_URL)

  private readonly slippageDefaults: PlentySlippageTolerance = {
    low: 0.005, // 0.5%
    medium: 0.01, // 1%
    high: 0.03 // 3%
  }

  private slippageTolerance: BigNumber

  constructor(
    private readonly protocolService: ProtocolService,
    private readonly formBuilder: FormBuilder,
    private readonly store$: Store<fromRoot.State>
  ) {
    this.initIdentifierMappings(this.supportedTokens)
    this.store$.select(getSelectedSlippage).subscribe((slippage) => {
      this.slippageTolerance = slippage
    })
  }

  private initIdentifierMappings(protocolIdentifiers: ProtocolSymbols[]): void {
    protocolIdentifiers.forEach((identifier: ProtocolSymbols) => {
      this.initIdentifierMapping(identifier)
    })
  }

  private initIdentifierMapping(protocolIdentifier: ProtocolSymbols): void {
    let exchangeIdentifier: string | undefined
    if (exchangeIdentifier !== undefined) {
      this.identifierExchangeToAirGapMap.set(exchangeIdentifier, protocolIdentifier)
      this.identifierAirGapToExchangeMap.set(protocolIdentifier, exchangeIdentifier)
    }
  }

  public async getAvailableFromCurrencies(): Promise<ProtocolSymbols[]> {
    return this.supportedFromCurrencies
  }

  public async getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<ProtocolSymbols[]> {
    const identifier: ProtocolSymbols | undefined = this.getAirGapIdentifier(selectedFrom)
    if (identifier === undefined || !this.isTokenSupported(identifier)) {
      return []
    }

    switch (identifier) {
      case SubProtocolSymbols.XTZ_PLENTY:
        return [
          SubProtocolSymbols.XTZ_USD,
          SubProtocolSymbols.XTZ_ETHTZ,
          SubProtocolSymbols.XTZ_KUSD,
          SubProtocolSymbols.XTZ_QUIPU,
          SubProtocolSymbols.XTZ_BTC,
          SubProtocolSymbols.XTZ_UUSD,
          SubProtocolSymbols.XTZ_YOU,
          SubProtocolSymbols.XTZ_CTEZ,
          SubProtocolSymbols.XTZ_WRAP
        ]

      case SubProtocolSymbols.XTZ_UUSD:
        return [SubProtocolSymbols.XTZ_YOU, SubProtocolSymbols.XTZ_UDEFI, SubProtocolSymbols.XTZ_PLENTY, SubProtocolSymbols.XTZ_CTEZ]

      case SubProtocolSymbols.XTZ_YOU:
        return [SubProtocolSymbols.XTZ_UUSD, SubProtocolSymbols.XTZ_PLENTY]

      case SubProtocolSymbols.XTZ_UDEFI:
        return [SubProtocolSymbols.XTZ_UUSD]

      case SubProtocolSymbols.XTZ_CTEZ:
        return [
          SubProtocolSymbols.XTZ_WRAP,
          SubProtocolSymbols.XTZ_UUSD,
          SubProtocolSymbols.XTZ_QUIPU,
          SubProtocolSymbols.XTZ_ETHTZ,
          SubProtocolSymbols.XTZ_KUSD,
          SubProtocolSymbols.XTZ_USD,
          SubProtocolSymbols.XTZ_PLENTY
        ]

      case SubProtocolSymbols.XTZ_KUSD:
        return [SubProtocolSymbols.XTZ_USD, SubProtocolSymbols.XTZ_PLENTY, SubProtocolSymbols.XTZ_CTEZ]

      case SubProtocolSymbols.XTZ_USD:
        return [SubProtocolSymbols.XTZ_KUSD, SubProtocolSymbols.XTZ_PLENTY, SubProtocolSymbols.XTZ_CTEZ]

      case SubProtocolSymbols.XTZ_ETHTZ:
        return [SubProtocolSymbols.XTZ_PLENTY, SubProtocolSymbols.XTZ_CTEZ]

      case SubProtocolSymbols.XTZ_QUIPU:
        return [SubProtocolSymbols.XTZ_PLENTY, SubProtocolSymbols.XTZ_CTEZ]

      default:
        return [SubProtocolSymbols.XTZ_PLENTY]
    }
  }

  public async getMinAmountForCurrency(fromCurrency: string, _toCurrency: string): Promise<string> {
    const fromProtocol: ICoinProtocol | undefined = await this.getProtocol(fromCurrency)
    if (fromProtocol === undefined) {
      return '0'
    }

    return new BigNumber(1).shiftedBy(-fromProtocol.decimals).toFixed()
  }

  public async getMaxExchangeAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string | undefined> {
    const [fromProtocol, toProtocol]: [ICoinProtocol | undefined, ICoinProtocol | undefined] = await Promise.all([
      this.getProtocol(fromCurrency),
      this.getProtocol(toCurrency)
    ])

    if (fromProtocol === undefined || toProtocol === undefined) {
      return undefined
    }

    let maxAmount: BigNumber | undefined
    if (this.isTokenSupported(toProtocol.identifier)) {
      maxAmount = await this.getMaxTokenAmount([fromProtocol.identifier, toProtocol.identifier])
    }

    return maxAmount.shiftedBy(-toProtocol.decimals).toFixed()
  }

  public async getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    const [fromProtocol, toProtocol]: [ICoinProtocol | undefined, ICoinProtocol | undefined] = await Promise.all([
      this.getProtocol(fromCurrency),
      this.getProtocol(toCurrency)
    ])

    if (fromProtocol === undefined || toProtocol === undefined) {
      return undefined
    }
    const shiftedAmount: BigNumber = new BigNumber(amount).shiftedBy(fromProtocol.decimals)

    let minAmount: BigNumber = await this.getMinExchangeAmount(
      fromProtocol.identifier,
      toProtocol.identifier,
      shiftedAmount,
      this.slippageTolerance
    )

    return minAmount.shiftedBy(-toProtocol.decimals).toFixed()
  }

  private dexContractKey(identifiers: ProtocolSymbols[], inverse: boolean = false) {
    return inverse ? `${identifiers[1]}/${identifiers[0]}` : `${identifiers[0]}/${identifiers[1]}`
  }

  private async getMinExchangeAmount(
    fromIdentifier: ProtocolSymbols,
    toIdentifier: ProtocolSymbols,
    amount: BigNumber,
    slippageTolerance: BigNumber
  ): Promise<BigNumber> {
    const contractKey = this.dexContractKey([fromIdentifier, toIdentifier])
    const pools = DEX_CONTRACTS[contractKey]
      ? {
        in: 'token1_pool',
        out: 'token2_pool'
      }
      : {
        in: 'token2_pool',
        out: 'token1_pool'
      }

    const storage: DexStorage | undefined = await this.getDexStorage([fromIdentifier, toIdentifier])
    if (storage === undefined) {
      return new BigNumber(0)
    }

    const currentInPool: BigNumber = new BigNumber(storage[pools.in])
    const currentOutPool: BigNumber = new BigNumber(storage[pools.out])

    const constantProduct: BigNumber = currentInPool.multipliedBy(currentOutPool)
    const expectedInPool: BigNumber = currentInPool.plus(amount.multipliedBy(1 - PLENTY_FEE))
    const expectedOutPool: BigNumber = constantProduct.dividedBy(expectedInPool)

    return currentOutPool.minus(expectedOutPool).multipliedBy(slippageTolerance.minus(1).abs()).integerValue(BigNumber.ROUND_DOWN)
  }

  public async validateAddress(_currency: string, _address: string): Promise<{ result: false; message: string }> {
    return { result: false, message: '' }
  }

  public async estimateFee(fromWallet: AirGapMarketWallet, toWallet: AirGapMarketWallet, amount: string): Promise<FeeDefaults | undefined> {
    const shiftedAmount: BigNumber = new BigNumber(amount).shiftedBy(fromWallet.protocol.decimals)

    const feeDefaults: FeeDefaults = await this.estimateTransactionFee(
      fromWallet.publicKey,
      fromWallet.protocol.identifier,
      toWallet.protocol.identifier,
      shiftedAmount,
      this.slippageTolerance
    )

    if (feeDefaults === undefined) {
      throw new Error(`Currency ${fromWallet.protocol.identifier} is not supported.`)
    }

    return feeDefaults
  }

  private async estimateTransactionFee(
    publicKey: string,
    fromIdentifier: ProtocolSymbols,
    toIdentifier: ProtocolSymbols,
    mutezAmount: BigNumber,
    slippageTolerance: BigNumber
  ): Promise<FeeDefaults> {
    const tezosProtocol: TezosProtocol = await this.getTezosProtocol()

    const minTokenAmount: BigNumber = await this.getMinExchangeAmount(fromIdentifier, toIdentifier, mutezAmount, slippageTolerance)
    const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)

    const operations: TezosOperation[] = await this.prepareTokenOperations(
      address.address,
      address.address,
      fromIdentifier,
      toIdentifier,
      mutezAmount,
      minTokenAmount
    )

    return tezosProtocol.estimateFeeDefaultsForOperations(publicKey, operations)
  }

  public async createTransaction(
    fromWallet: AirGapMarketWallet,
    toWallet: AirGapMarketWallet,
    amount: string,
    fee: string,
    _data: any
  ): Promise<ExchangeTransaction> {
    const shiftedAmount: BigNumber = new BigNumber(amount).shiftedBy(fromWallet.protocol.decimals)
    const shiftedFee: BigNumber = new BigNumber(fee).shiftedBy(fromWallet.protocol.feeDecimals)
    const recipient: string = toWallet.receivingPublicAddress

    let minAmount: BigNumber = new BigNumber(0)
    let transaction: PlentyTransaction | undefined

    if (this.supportedTokens.includes(fromWallet.protocol.identifier)) {
      minAmount = await this.getMinExchangeAmount(
        fromWallet.protocol.identifier,
        toWallet.protocol.identifier,
        shiftedAmount,
        this.slippageTolerance
      )
      transaction = await this.createTokenTransaction(
        fromWallet.publicKey,
        fromWallet.protocol,
        toWallet.protocol,
        recipient,
        shiftedAmount,
        minAmount,
        shiftedFee
      )
    }

    if (transaction === undefined) {
      throw new Error(`Currency ${fromWallet.protocol.identifier} is not supported.`)
    }

    return {
      payoutAddress: fromWallet.addresses[0],
      payinAddress: this.getDexContractAddress([fromWallet.protocol.identifier, toWallet.protocol.identifier]),
      amountExpectedFrom: amount,
      amountExpectedTo: minAmount.shiftedBy(-toWallet.protocol.decimals).toFixed(),
      fee,
      transaction: {
        details: transaction.details,
        unsigned: {
          publicKey: fromWallet.publicKey,
          transaction: transaction.unsigned
        }
      }
    }
  }

  private async createTokenTransaction(
    publicKey: string,
    fromProtocol: ICoinProtocol,
    toProtocol: ICoinProtocol,
    recipient: string,
    tokenAmount: BigNumber,
    minReceivedAmount: BigNumber,
    fee?: BigNumber
  ): Promise<PlentyTransaction> {
    const tezosProtocol: TezosProtocol = await this.getTezosProtocol()

    const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)
    const operations: TezosOperation[] = await this.prepareTokenOperations(
      address.address,
      recipient,
      fromProtocol.identifier,
      toProtocol.identifier,
      tokenAmount,
      minReceivedAmount,
      fee
    )

    const wrappedOperations: TezosWrappedOperation = await tezosProtocol.prepareOperations(publicKey, operations, false)
    const transaction: RawTezosTransaction = await tezosProtocol.forgeAndWrapOperations(wrappedOperations)
    const baseDetails: IAirGapTransaction[] = await toProtocol.getTransactionDetails({ publicKey, transaction })
    const extendedDetails: IAirGapTransaction[] = await this.getExtendedTokenTransactionDetails(fromProtocol, toProtocol, baseDetails)

    return {
      details: extendedDetails,
      unsigned: transaction
    }
  }

  private async prepareTokenOperations(
    sourceAddress: string,
    destinationAddress: string,
    fromIdentifier: ProtocolSymbols,
    toIdentifier: ProtocolSymbols,
    tokenAmount: BigNumber,
    minReceivedAmount: BigNumber,
    fee?: BigNumber
  ): Promise<TezosOperation[]> {
    const dexContract: Contract | undefined = await this.getDexContract([fromIdentifier, toIdentifier])
    if (dexContract === undefined) {
      throw new Error('Could not create an exchange transaction.')
    }

    const storage: DexStorage = await this.getDexStorage(dexContract)

    const inverseDirection = this.isSwapDirectionInverse([fromIdentifier, toIdentifier])
    const inputTokenAddress: string = inverseDirection ? storage.token2Address : storage.token1Address
    const inputTokenContract: Contract = await this.getContract(inputTokenAddress)
    const outputTokenAddress: string = inverseDirection ? storage.token1Address : storage.token2Address
    const outputTokenId: number = inverseDirection ? storage.token1Id : storage.token2Id

    if (this.isFA1p2(inputTokenContract)) {
      return this.prepareFA1p2TokenOperations(
        dexContract,
        inputTokenContract,
        sourceAddress,
        destinationAddress,
        inputTokenAddress,
        outputTokenAddress,
        outputTokenId,
        tokenAmount,
        minReceivedAmount,
        fee
      )
    } else if (this.isFA2(inputTokenContract)) {
      return this.prepareFA2TokenToTezOperations(
        dexContract,
        inputTokenContract,
        sourceAddress,
        destinationAddress,
        inputTokenAddress,
        outputTokenAddress,
        outputTokenId,
        tokenAmount,
        minReceivedAmount,
        fee
      )
    } else {
      throw new Error('Unsupported contract type.')
    }
  }

  private async prepareFA1p2TokenOperations(
    dexContract: Contract,
    inputTokenContract: Contract,
    sourceAddress: string,
    destinationAddress: string,
    inputTokenAddress: string,
    outputTokenAddress: string,
    outputTokenId: number,
    tokenAmount: BigNumber,
    minReceivedAmount: BigNumber,
    fee?: BigNumber
  ): Promise<TezosOperation[]> {
    const approve: TransferParams = inputTokenContract.methods[FA1p2_ENTRYPOINTS.approve](
      dexContract.address,
      tokenAmount.toNumber()
    ).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const swap: TransferParams = dexContract.methods[DEX_ENTRYPOINTS.swap](
      minReceivedAmount.toFixed(),
      destinationAddress,
      outputTokenAddress,
      outputTokenId,
      tokenAmount.toFixed()
    ).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const approveOperation: PartialTransactionOperation = this.prepareApproveOperation(approve, inputTokenAddress)
    const swapOperation: PartialTransactionOperation = this.prepareTransactionOperation(swap)
    return [approveOperation, swapOperation]
  }

  private async prepareFA2TokenToTezOperations(
    dexContract: Contract,
    inputTokenContract: Contract,
    sourceAddress: string,
    destinationAddress: string,
    _inputTokenAddress: string,
    outputTokenAddress: string,
    outputTokenId: number,
    tokenAmount: BigNumber,
    minReceivedAmount: BigNumber,
    fee?: BigNumber
  ): Promise<TezosOperation[]> {
    const addOperator: TransferParams = inputTokenContract.methods[FA2_ENTRYPOINTS.updateOperators]([
      {
        add_operator: {
          owner: sourceAddress,
          operator: dexContract.address,
          token_id: outputTokenId
        }
      }
    ]).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const swap: TransferParams = dexContract.methods[DEX_ENTRYPOINTS.swap](
      minReceivedAmount.toFixed(),
      destinationAddress,
      outputTokenAddress,
      outputTokenId,
      tokenAmount.toFixed()
    ).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const removeOperator: TransferParams = inputTokenContract.methods[FA2_ENTRYPOINTS.updateOperators]([
      {
        remove_operator: {
          owner: sourceAddress,
          operator: dexContract.address,
          token_id: outputTokenId
        }
      }
    ]).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const addOperatorOperation: PartialTransactionOperation = this.prepareTransactionOperation(addOperator)
    const swapOperation: PartialTransactionOperation = this.prepareTransactionOperation(swap)
    const removeOperatorOperation: PartialTransactionOperation = this.prepareTransactionOperation(removeOperator)

    return [addOperatorOperation, swapOperation, removeOperatorOperation]
  }

  private async getExtendedTokenTransactionDetails(
    fromProtocol: ICoinProtocol,
    toProtocol: ICoinProtocol,
    baseDetails: IAirGapTransaction[]
  ): Promise<IAirGapTransaction[]> {
    return Promise.all(
      baseDetails.map(async (details: IAirGapTransaction) => {
        const parameters: TezosTransactionParameters | undefined = details.extra?.parameters

        let extendedDetails: Partial<IAirGapTransaction> = {}
        if (parameters?.entrypoint === DEX_ENTRYPOINTS.tokenToTezPayment) {
          extendedDetails = await this.getDetailsFromTokenToTezPayment(fromProtocol, toProtocol, parameters)
        }

        return Object.assign(details, extendedDetails)
      })
    )
  }

  private async getDetailsFromTokenToTezPayment(
    fromProtocol: ICoinProtocol,
    toProtocol: ICoinProtocol,
    parameters: TezosTransactionParameters
  ): Promise<Partial<IAirGapTransaction>> {
    const contract: Contract = await this.getDexContract([fromProtocol.identifier, toProtocol.identifier])
    if (contract === undefined) {
      return {}
    }

    const schema: Schema = new Schema(contract.entrypoints.entrypoints[parameters.entrypoint])
    const data: { amount?: number; min_out?: number; receiver?: string } = schema.Execute(parameters.value)

    if (data.amount === undefined) {
      return {}
    }

    return {
      amount: data.amount.toString()
    }
  }

  public async getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse> {
    const tezosProtocol = await this.getTezosProtocol()
    try {
      const transactionStatuses: AirGapTransactionStatus[] = await tezosProtocol.getTransactionStatuses([transactionId])
      const transactionStatus: AirGapTransactionStatus = transactionStatuses[0]

      return new PlentyTransactionStatusResponse(transactionStatus)
    } catch {
      return new PlentyTransactionStatusResponse('not_injected')
    }
  }

  public convertExchangeIdentifierToAirGapIdentifier(identifiers: ExchangeIdentifier[]): ProtocolSymbols[] {
    return identifiers
      .map((identifier: ExchangeIdentifier) => this.exchangeIdentifierToAirGapIdentifier(identifier))
      .filter((identifier: ProtocolSymbols | undefined) => identifier !== undefined)
  }

  private exchangeIdentifierToAirGapIdentifier(identifier: ExchangeIdentifier): ProtocolSymbols | undefined {
    return this.identifierExchangeToAirGapMap.has(identifier) ? this.identifierExchangeToAirGapMap.get(identifier) : undefined
  }

  public convertAirGapIdentifierToExchangeIdentifier(identifiers: ProtocolSymbols[]): ExchangeIdentifier[] {
    return identifiers
      .map((identifier: ProtocolSymbols) => this.airGapIdentifierToExchangeIdentifier(identifier))
      .filter((identifier: ExchangeIdentifier | undefined) => identifier !== undefined)
  }

  private airGapIdentifierToExchangeIdentifier(identifier: ProtocolSymbols): ExchangeIdentifier | undefined {
    return this.identifierAirGapToExchangeMap.has(identifier) ? this.identifierAirGapToExchangeMap.get(identifier) : undefined
  }

  public async getCustomUI(): Promise<ExchangeUI> {
    const defaultSlippageTolerance: keyof PlentySlippageTolerance = 'low'
    const defaultValue: string = this.slippageDefaults[defaultSlippageTolerance].toString()

    const valueToControlValue = (value: string) => new BigNumber(value).multipliedBy(100).toFixed()
    const controlValueToValue = (controlValue: string) => new BigNumber(controlValue).dividedBy(100).toFixed()

    const form: FormGroup = this.formBuilder.group({
      [ControlId.SLIPPAGE_TOLERANCE]: [defaultValue, Validators.required],
      [ControlId.SLIPPAGE_TOLERANCE_CONTROL]: [valueToControlValue(defaultValue), Validators.required]
    })

    const widgets: UIWidget[] = [
      new UIOptionButtonGroup({
        id: ControlId.SLIPPAGE_TOLERANCE,
        label: 'exchange-quipuswap.slippage-tolerance.label',
        defaultSelected: defaultValue,
        optionButtons: Object.entries(this.slippageDefaults).map(([_, value]: [string, string]) => ({
          value: value.toString(),
          label: `${valueToControlValue(value)}%`
        })),
        customInput: {
          id: ControlId.SLIPPAGE_TOLERANCE_CONTROL,
          type: 'number',
          suffix: '%',
          formControl: form.controls[ControlId.SLIPPAGE_TOLERANCE_CONTROL],
          controlValueToValue
        },
        formControl: form.controls[ControlId.SLIPPAGE_TOLERANCE]
      })
    ]

    return {
      form,
      widgets
    }
  }

  public async getCustomData(_input: unknown): Promise<void> {
    return
  }

  private getAirGapIdentifier(identifier: string): ProtocolSymbols | undefined {
    return isProtocolSymbol(identifier) ? identifier : undefined
  }

  private async getProtocol(currency: string): Promise<ICoinProtocol | undefined> {
    const identifier: ProtocolSymbols | undefined = this.getAirGapIdentifier(currency)

    return identifier ? this.protocolService.getProtocol(identifier) : undefined
  }

  private async getTezosProtocol(): Promise<TezosProtocol> {
    const tezosProtocol: ICoinProtocol | undefined = await this.protocolService.getProtocol(MainProtocolSymbols.XTZ)
    if (tezosProtocol === undefined) {
      throw new Error(`${MainProtocolSymbols.XTZ} is not supported.`)
    }

    return tezosProtocol as TezosProtocol
  }

  private isTokenSupported(identifier: ProtocolSymbols): boolean {
    return this.supportedTokens.includes(identifier)
  }

  private async getContract(address: string): Promise<Contract> {
    return this.tezos.contract.at(address)
  }

  private async getDexContract(identifiers: ProtocolSymbols[]): Promise<Contract | undefined> {
    const contractKey = this.dexContractKey(identifiers)
    const identifier = DEX_CONTRACTS[contractKey] ? contractKey : this.dexContractKey(identifiers, true)

    if (!this.dexContracts.has(identifier)) {
      const address: string | undefined = DEX_CONTRACTS[identifier]
      const contract: Contract | undefined = address ? await this.getContract(address) : undefined

      if (contract) {
        this.dexContracts.set(identifier, contract)
      }
    }

    return this.dexContracts.get(identifier)
  }

  private isSwapDirectionInverse(identifiers: ProtocolSymbols[]): boolean {
    const contractKey = this.dexContractKey(identifiers)
    return DEX_CONTRACTS[contractKey] ? false : true
  }

  private getDexContractAddress(identifiers: ProtocolSymbols[]): string {
    const contractKey = this.dexContractKey(identifiers)
    const identifier = DEX_CONTRACTS[contractKey] ? contractKey : this.dexContractKey(identifiers, true)
    return DEX_CONTRACTS[identifier]
  }

  private async getDexStorage(identifiers: ProtocolSymbols[]): Promise<DexStorage | undefined>
  private async getDexStorage(contract: Contract): Promise<DexStorage>
  private async getDexStorage(identifiersOrContract: ProtocolSymbols[] | Contract): Promise<DexStorage | undefined> {
    const contract: Contract | undefined = Array.isArray(identifiersOrContract)
      ? await this.getDexContract(identifiersOrContract)
      : identifiersOrContract

    return contract?.storage()
  }

  private async getMaxTokenAmount(identifiers: ProtocolSymbols[]): Promise<BigNumber | undefined> {
    const storage: DexStorage | undefined = await this.getDexStorage(identifiers)
    if (storage === undefined) {
      return undefined
    }

    const tokenPool: number = storage.token2_pool

    return new BigNumber(tokenPool).dividedBy(3)
  }

  private prepareTransactionOperation(transferParams: TransferParams): PartialTransactionOperation {
    return {
      kind: TezosOperationType.TRANSACTION,
      source: transferParams.source,
      fee: transferParams.fee?.toString(),
      amount: transferParams.amount.toString(),
      destination: transferParams.to,
      parameters: transferParams.parameter as any
    }
  }

  private prepareApproveOperation(transferParams: TransferParams, destination: string): PartialTransactionOperation {
    return {
      kind: TezosOperationType.TRANSACTION,
      source: transferParams.source,
      fee: transferParams.fee?.toString(),
      amount: transferParams.amount.toString(),
      destination,
      parameters: transferParams.parameter as any
    }
  }

  private isFA1p2(contract: Contract): boolean {
    return typeof contract.methods.approve === 'function'
  }

  private isFA2(contract: Contract): boolean {
    return typeof contract.methods.update_operators === 'function'
  }
}
