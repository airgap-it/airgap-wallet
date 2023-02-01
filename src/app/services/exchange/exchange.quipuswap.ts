// tslint:disable: max-classes-per-file
import { ProtocolService } from '@airgap/angular-core'
import {
  AirGapMarketWallet,
  FeeDefaults,
  ICoinProtocol,
  isProtocolSymbol,
  MainProtocolSymbols,
  ProtocolSymbols,
  SubProtocolSymbols
} from '@airgap/coinlib-core'
import { AirGapTransactionStatus, IAirGapTransaction } from '@airgap/coinlib-core/interfaces/IAirGapTransaction'
import { RawTezosTransaction, TezosProtocol, TezosWrappedOperation } from '@airgap/tezos'
import { TezosOperation } from '@airgap/tezos/v0/protocol/types/operations/TezosOperation'
import { TezosTransactionOperation, TezosTransactionParameters } from '@airgap/tezos/v0/protocol/types/operations/Transaction'
import { TezosAddressResult } from '@airgap/tezos/v0/protocol/types/TezosAddressResult'
import { TezosOperationType } from '@airgap/tezos/v0/protocol/types/TezosOperationType'
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

interface DexStorage {
  storage: {
    tez_pool: number
    token_pool: number

    token_address: string
    token_id: number
  }
}

type PartialTransactionOperation = TezosOperation & Partial<TezosTransactionOperation>

interface QuipuswapTransaction {
  details: IAirGapTransaction[]
  unsigned: RawTezosTransaction
}

interface QuipuswapSlippageTolerance {
  low: number
  medium: number
  high: number
}

class QuipuswapTransactionStatusResponse implements ExchangeTransactionStatusResponse {
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

const XTZ_QUIPU_IDENTIFIER: string = 'tez'

const QUIPUSWAP_FEE: number = 0.003 // 0.3%

enum ControlId {
  SLIPPAGE_TOLERANCE = 'slippageTolerance',
  SLIPPAGE_TOLERANCE_CONTROL = 'slippageToleranceControl'
}

const DEX_CONTRACTS = {
  // [SubProtocolSymbols.XTZ_BTC]: 'KT1WBLrLE2vG8SedBqiSJFm4VVAZZBytJYHc',
  [SubProtocolSymbols.XTZ_ETHTZ]: 'KT1Evsp2yA19Whm24khvFPcwimK6UaAJu8Zo',
  [SubProtocolSymbols.XTZ_KUSD]: 'KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6',
  [SubProtocolSymbols.XTZ_STKR]: 'KT1BMEEPX7MWzwwadW3NCSZe9XGmFJ7rs7Dr',
  [SubProtocolSymbols.XTZ_USD]: 'KT1WxgZ1ZSfMgmsSDDcUn8Xn577HwnQ7e1Lb',
  [SubProtocolSymbols.XTZ_UUSD]: 'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di',
  [SubProtocolSymbols.XTZ_YOU]: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE'
}

const FA1p2_ENTRYPOINTS = {
  approve: 'approve'
}

const FA2_ENTRYPOINTS = {
  updateOperators: 'update_operators'
}

const DEX_ENTRYPOINTS = {
  tezToTokenPayment: 'tezToTokenPayment',
  tokenToTezPayment: 'tokenToTezPayment'
}

export class QuipuswapExchange implements Exchange {
  private readonly identifierExchangeToAirGapMap: Map<ExchangeIdentifier, ProtocolSymbols> = new Map<ExchangeIdentifier, ProtocolSymbols>()
  private readonly identifierAirGapToExchangeMap: Map<ProtocolSymbols, ExchangeIdentifier> = new Map<ProtocolSymbols, ExchangeIdentifier>()

  private readonly dexContracts: Map<ProtocolSymbols, Contract> = new Map<ProtocolSymbols, Contract>()

  private readonly supportedTokens: ProtocolSymbols[] = Object.keys(DEX_CONTRACTS) as ProtocolSymbols[]
  private get supportedCurrencies(): ProtocolSymbols[] {
    return [MainProtocolSymbols.XTZ, ...this.supportedTokens]
  }

  private readonly tezos: TezosToolkit = new TezosToolkit(NODE_URL)

  private readonly slippageDefaults: QuipuswapSlippageTolerance = {
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
    switch (protocolIdentifier) {
      case MainProtocolSymbols.XTZ:
        exchangeIdentifier = XTZ_QUIPU_IDENTIFIER
        break
      default:
        exchangeIdentifier = DEX_CONTRACTS[protocolIdentifier]
    }

    if (exchangeIdentifier !== undefined) {
      this.identifierExchangeToAirGapMap.set(exchangeIdentifier, protocolIdentifier)
      this.identifierAirGapToExchangeMap.set(protocolIdentifier, exchangeIdentifier)
    }
  }

  public async getAvailableFromCurrencies(): Promise<ProtocolSymbols[]> {
    return this.supportedCurrencies
  }

  public async getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<ProtocolSymbols[]> {
    const identifier: ProtocolSymbols | undefined = this.getAirGapIdentifier(selectedFrom)
    if (identifier === undefined) {
      return []
    }

    if (identifier === MainProtocolSymbols.XTZ) {
      return this.supportedTokens
    } else if (this.isTokenSupported(identifier)) {
      return [MainProtocolSymbols.XTZ]
    } else {
      return []
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
    if (toProtocol.identifier === MainProtocolSymbols.XTZ) {
      maxAmount = await this.getMaxTezAmount(fromProtocol.identifier)
    } else if (this.isTokenSupported(toProtocol.identifier)) {
      maxAmount = await this.getMaxTokenAmount(toProtocol.identifier)
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

    let minAmount: BigNumber = new BigNumber(0)
    if (fromProtocol.identifier === MainProtocolSymbols.XTZ) {
      minAmount = await this.getMinTezToTokenExchangeAmount(toProtocol.identifier, shiftedAmount, this.slippageTolerance)
    } else if (this.isTokenSupported(fromProtocol.identifier)) {
      minAmount = await this.getMinTokenToTezExchangeAmount(fromProtocol.identifier, shiftedAmount, this.slippageTolerance)
    }

    return minAmount.shiftedBy(-toProtocol.decimals).toFixed()
  }

  private async getMinTezToTokenExchangeAmount(
    token: ProtocolSymbols,
    mutezAmount: BigNumber,
    slippageTolerance: BigNumber
  ): Promise<BigNumber> {
    return this.getMinExchangeAmount(token, mutezAmount, slippageTolerance, { in: 'tez_pool', out: 'token_pool' })
  }

  private async getMinTokenToTezExchangeAmount(
    token: ProtocolSymbols,
    tokenAmount: BigNumber,
    slippageTolerance: BigNumber
  ): Promise<BigNumber> {
    return this.getMinExchangeAmount(token, tokenAmount, slippageTolerance, { in: 'token_pool', out: 'tez_pool' })
  }

  private async getMinExchangeAmount(
    token: ProtocolSymbols,
    amount: BigNumber,
    slippageTolerance: BigNumber,
    pools: { in: 'tez_pool'; out: 'token_pool' } | { in: 'token_pool'; out: 'tez_pool' }
  ): Promise<BigNumber> {
    const storage: DexStorage | undefined = await this.getDexStorage(token)
    if (storage === undefined) {
      return new BigNumber(0)
    }

    const currentInPool: BigNumber = new BigNumber(storage.storage[pools.in])
    const currentOutPool: BigNumber = new BigNumber(storage.storage[pools.out])

    const constantProduct: BigNumber = currentInPool.multipliedBy(currentOutPool)
    const expectedInPool: BigNumber = currentInPool.plus(amount.multipliedBy(1 - QUIPUSWAP_FEE))
    const expectedOutPool: BigNumber = constantProduct.dividedBy(expectedInPool)

    return currentOutPool.minus(expectedOutPool).multipliedBy(slippageTolerance.minus(1).abs()).integerValue(BigNumber.ROUND_DOWN)
  }

  public async validateAddress(_currency: string, _address: string): Promise<{ result: false; message: string }> {
    return { result: false, message: '' }
  }

  public async estimateFee(fromWallet: AirGapMarketWallet, toWallet: AirGapMarketWallet, amount: string): Promise<FeeDefaults | undefined> {
    const shiftedAmount: BigNumber = new BigNumber(amount).shiftedBy(fromWallet.protocol.decimals)

    let feeDefaults: FeeDefaults
    if (fromWallet.protocol.identifier === MainProtocolSymbols.XTZ) {
      feeDefaults = await this.estimateTezToTokenTransactionFee(
        fromWallet.publicKey,
        toWallet.protocol.identifier,
        shiftedAmount,
        this.slippageTolerance
      )
    } else if (this.supportedTokens.includes(fromWallet.protocol.identifier)) {
      feeDefaults = await this.estimateTokenToTezTransactionFee(
        fromWallet.publicKey,
        fromWallet.protocol.identifier,
        shiftedAmount,
        this.slippageTolerance
      )
    }

    if (feeDefaults === undefined) {
      throw new Error(`Currency ${fromWallet.protocol.identifier} is not supported.`)
    }

    return feeDefaults
  }

  private async estimateTezToTokenTransactionFee(
    publicKey: string,
    token: ProtocolSymbols,
    mutezAmount: BigNumber,
    slippageTolerance: BigNumber
  ): Promise<FeeDefaults> {
    const tezosProtocol: TezosProtocol = await this.getTezosProtocol()

    const minTokenAmount: BigNumber = await this.getMinTezToTokenExchangeAmount(token, mutezAmount, slippageTolerance)
    const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)

    const operations: TezosOperation[] = await this.prepareTezToTokenOperations(
      address.address,
      address.address,
      token,
      mutezAmount,
      minTokenAmount
    )

    return tezosProtocol.estimateFeeDefaultsForOperations(publicKey, operations)
  }

  private async estimateTokenToTezTransactionFee(
    publicKey: string,
    token: ProtocolSymbols,
    tokenAmount: BigNumber,
    slippageTolerance: BigNumber
  ): Promise<FeeDefaults> {
    const tezosProtocol: TezosProtocol = await this.getTezosProtocol()

    const minTezAmount: BigNumber = await this.getMinTokenToTezExchangeAmount(token, tokenAmount, slippageTolerance)
    const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)

    const operations: TezosOperation[] = await this.prepareTokenToTezOperations(
      address.address,
      address.address,
      token,
      tokenAmount,
      minTezAmount
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
    let tokenProtocol: ICoinProtocol | undefined
    let transaction: QuipuswapTransaction | undefined
    if (fromWallet.protocol.identifier === MainProtocolSymbols.XTZ) {
      tokenProtocol = toWallet.protocol
      minAmount = await this.getMinTezToTokenExchangeAmount(tokenProtocol.identifier, shiftedAmount, this.slippageTolerance)
      transaction = await this.createTezToTokenTransaction(
        fromWallet.publicKey,
        tokenProtocol,
        recipient,
        shiftedAmount,
        minAmount,
        shiftedFee
      )
    } else if (this.supportedTokens.includes(fromWallet.protocol.identifier)) {
      tokenProtocol = fromWallet.protocol
      minAmount = await this.getMinTokenToTezExchangeAmount(tokenProtocol.identifier, shiftedAmount, this.slippageTolerance)
      transaction = await this.createTokenToTezTransaction(
        fromWallet.publicKey,
        tokenProtocol,
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
      payinAddress: DEX_CONTRACTS[tokenProtocol.identifier],
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

  private async createTezToTokenTransaction(
    publicKey: string,
    tokenProtocol: ICoinProtocol,
    recipient: string,
    mutezAmount: BigNumber,
    minTokenAmount: BigNumber,
    fee?: BigNumber
  ): Promise<QuipuswapTransaction> {
    const tezosProtocol: TezosProtocol = await this.getTezosProtocol()

    const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)
    const operations: TezosOperation[] = await this.prepareTezToTokenOperations(
      address.address,
      recipient,
      tokenProtocol.identifier,
      mutezAmount,
      minTokenAmount,
      fee
    )
    const wrappedOperations: TezosWrappedOperation = await tezosProtocol.prepareOperations(publicKey, operations, false)
    const transaction: RawTezosTransaction = await tezosProtocol.forgeAndWrapOperations(wrappedOperations)
    const details: IAirGapTransaction[] = await tokenProtocol.getTransactionDetails({ publicKey, transaction })

    return { details, unsigned: transaction }
  }

  private async prepareTezToTokenOperations(
    sourceAddress: string,
    destinationAddress: string,
    token: ProtocolSymbols,
    mutezAmount: BigNumber,
    minTokenAmount: BigNumber,
    fee?: BigNumber
  ): Promise<TezosOperation[]> {
    const contract: Contract | undefined = await this.getDexContract(token)
    if (contract === undefined) {
      throw new Error('Could not create an exchange transaction.')
    }

    const payment: TransferParams = contract.methods[DEX_ENTRYPOINTS.tezToTokenPayment](
      minTokenAmount.toNumber(),
      destinationAddress
    ).toTransferParams({ source: sourceAddress, amount: mutezAmount.toNumber(), mutez: true, fee: fee?.toNumber() })

    const paymentOperation: PartialTransactionOperation = this.prepareTransactionOperation(payment)

    return [paymentOperation]
  }

  private async createTokenToTezTransaction(
    publicKey: string,
    tokenProtocol: ICoinProtocol,
    recipient: string,
    tokenAmount: BigNumber,
    minTezAmount: BigNumber,
    fee?: BigNumber
  ): Promise<QuipuswapTransaction> {
    const tezosProtocol: TezosProtocol = await this.getTezosProtocol()

    const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)
    const operations: TezosOperation[] = await this.prepareTokenToTezOperations(
      address.address,
      recipient,
      tokenProtocol.identifier,
      tokenAmount,
      minTezAmount,
      fee
    )


    console.log(publicKey)
    console.log(JSON.stringify(operations, null, 2))
    const wrappedOperations: TezosWrappedOperation = await tezosProtocol.prepareOperations(publicKey, operations, false)
    const transaction: RawTezosTransaction = await tezosProtocol.forgeAndWrapOperations(wrappedOperations)
    const baseDetails: IAirGapTransaction[] = await tokenProtocol.getTransactionDetails({ publicKey, transaction })
    const extendedDetails: IAirGapTransaction[] = await this.getExtendedTokenTransactionDetails(tokenProtocol, baseDetails)

    return {
      details: extendedDetails,
      unsigned: transaction
    }
  }

  private async prepareTokenToTezOperations(
    sourceAddress: string,
    destinationAddress: string,
    token: ProtocolSymbols,
    tokenAmount: BigNumber,
    minTezAmount: BigNumber,
    fee?: BigNumber
  ): Promise<TezosOperation[]> {
    const dexContract: Contract | undefined = await this.getDexContract(token)
    if (dexContract === undefined) {
      throw new Error('Could not create an exchange transaction.')
    }

    const storage: DexStorage = await this.getDexStorage(dexContract)

    const tokenAddress: string = storage.storage.token_address
    const tokenContract: Contract = await this.getContract(tokenAddress)

    if (this.isFA1p2(tokenContract)) {
      return this.prepareFA1p2TokenToTezOperations(
        dexContract,
        tokenContract,
        sourceAddress,
        destinationAddress,
        tokenAmount,
        minTezAmount,
        fee
      )
    } else if (this.isFA2(tokenContract)) {
      return this.prepareFA2TokenToTezOperations(
        dexContract,
        tokenContract,
        sourceAddress,
        destinationAddress,
        tokenAmount,
        minTezAmount,
        fee
      )
    } else {
      throw new Error('Unsupported contract type.')
    }
  }

  private async prepareFA1p2TokenToTezOperations(
    dexContract: Contract,
    tokenContract: Contract,
    sourceAddress: string,
    destinationAddress: string,
    tokenAmount: BigNumber,
    minTezAmount: BigNumber,
    fee?: BigNumber
  ): Promise<TezosOperation[]> {
    const approve: TransferParams = tokenContract.methods[FA1p2_ENTRYPOINTS.approve](
      dexContract.address,
      tokenAmount.toNumber()
    ).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const payment: TransferParams = dexContract.methods[DEX_ENTRYPOINTS.tokenToTezPayment](
      tokenAmount.toFixed(),
      minTezAmount.toFixed(),
      destinationAddress
    ).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const approveOperation: PartialTransactionOperation = this.prepareTransactionOperation(approve)
    const paymentOperation: PartialTransactionOperation = this.prepareTransactionOperation(payment)

    return [approveOperation, paymentOperation]
  }

  private async prepareFA2TokenToTezOperations(
    dexContract: Contract,
    tokenContract: Contract,
    sourceAddress: string,
    destinationAddress: string,
    tokenAmount: BigNumber,
    minTezAmount: BigNumber,
    fee?: BigNumber
  ): Promise<TezosOperation[]> {
    const storage: DexStorage = await this.getDexStorage(dexContract)
    const tokenId: number = storage.storage.token_id

    const addOperator: TransferParams = tokenContract.methods[FA2_ENTRYPOINTS.updateOperators]([
      {
        add_operator: {
          owner: sourceAddress,
          operator: dexContract.address,
          token_id: tokenId
        }
      }
    ]).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const payment: TransferParams = dexContract.methods[DEX_ENTRYPOINTS.tokenToTezPayment](
      tokenAmount.toFixed(),
      minTezAmount.toFixed(),
      destinationAddress
    ).toTransferParams({ source: sourceAddress, fee: fee?.toNumber() })

    const removeOperator: TransferParams = tokenContract.methods[FA2_ENTRYPOINTS.updateOperators]([
      {
        remove_operator: {
          owner: sourceAddress,
          operator: dexContract.address,
          token_id: tokenId
        }
      }
    ]).toTransferParams({ source: sourceAddress })

    const addOperatorOperation: PartialTransactionOperation = this.prepareTransactionOperation(addOperator)
    const paymentOperation: PartialTransactionOperation = this.prepareTransactionOperation(payment)
    const removeOperatorOperation: PartialTransactionOperation = this.prepareTransactionOperation(removeOperator)

    return [addOperatorOperation, paymentOperation, removeOperatorOperation]
  }

  private async getExtendedTokenTransactionDetails(
    tokenProtocol: ICoinProtocol,
    baseDetails: IAirGapTransaction[]
  ): Promise<IAirGapTransaction[]> {
    return Promise.all(
      baseDetails.map(async (details: IAirGapTransaction) => {
        const parameters: TezosTransactionParameters | undefined = details.extra?.parameters

        let extendedDetails: Partial<IAirGapTransaction> = {}
        if (parameters?.entrypoint === DEX_ENTRYPOINTS.tokenToTezPayment) {
          extendedDetails = await this.getDetailsFromTokenToTezPayment(tokenProtocol, parameters)
        }

        return Object.assign(details, extendedDetails)
      })
    )
  }

  private async getDetailsFromTokenToTezPayment(
    tokenProtocol: ICoinProtocol,
    parameters: TezosTransactionParameters
  ): Promise<Partial<IAirGapTransaction>> {
    const contract: Contract = await this.getDexContract(tokenProtocol.identifier)
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

      return new QuipuswapTransactionStatusResponse(transactionStatus)
    } catch {
      return new QuipuswapTransactionStatusResponse('not_injected')
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
    const defaultSlippageTolerance: keyof QuipuswapSlippageTolerance = 'low'
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
    return isProtocolSymbol(identifier) ? identifier : this.exchangeIdentifierToAirGapIdentifier(identifier)
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

  private async getDexContract(identifier: ProtocolSymbols): Promise<Contract | undefined> {
    if (!this.dexContracts.has(identifier)) {
      const address: string | undefined = DEX_CONTRACTS[identifier]
      const contract: Contract | undefined = address ? await this.getContract(address) : undefined

      if (contract) {
        this.dexContracts.set(identifier, contract)
      }
    }

    return this.dexContracts.get(identifier)
  }

  private async getDexStorage(identifier: ProtocolSymbols): Promise<DexStorage | undefined>
  private async getDexStorage(contract: Contract): Promise<DexStorage>
  private async getDexStorage(identifierOrContract: ProtocolSymbols | Contract): Promise<DexStorage | undefined> {
    const contract: Contract | undefined =
      typeof identifierOrContract === 'string' ? await this.getDexContract(identifierOrContract) : identifierOrContract

    return contract?.storage()
  }

  private async getMaxTezAmount(identifier: ProtocolSymbols): Promise<BigNumber | undefined> {
    const storage: DexStorage | undefined = await this.getDexStorage(identifier)
    if (storage === undefined) {
      return undefined
    }

    const tezPool: number = storage.storage.tez_pool

    return new BigNumber(tezPool).dividedBy(3)
  }

  private async getMaxTokenAmount(identifier: ProtocolSymbols): Promise<BigNumber | undefined> {
    const storage: DexStorage | undefined = await this.getDexStorage(identifier)
    if (storage === undefined) {
      return undefined
    }

    const tokenPool: number = storage.storage.token_pool

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

  private isFA1p2(contract: Contract): boolean {
    return typeof contract.methods.approve === 'function'
  }

  private isFA2(contract: Contract): boolean {
    return typeof contract.methods.update_operators === 'function'
  }
}
