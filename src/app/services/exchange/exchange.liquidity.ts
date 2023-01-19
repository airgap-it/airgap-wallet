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
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { Contract, ContractAbstraction, ContractProvider, TezosToolkit, TransferParams } from '@taquito/taquito'
import { MichelsonV1ExpressionBase, MichelsonV1ExpressionExtended } from '@taquito/rpc'
import BigNumber from 'bignumber.js'
import { UIOptionButtonGroup } from '../../models/widgets/input/UIOptionButtonGroup'
import { UIWidget } from '../../models/widgets/UIWidget'
import { Exchange, ExchangeIdentifier, ExchangeTransaction, ExchangeTransactionStatusResponse, ExchangeUI } from './exchange.interface'
import * as liquidityBakingCalculations from './liquidity-baking-calculations'
import { Store } from '@ngrx/store'
import * as fromExchange from '../../pages/exchange/reducer'
import { getSelectedSlippage } from 'src/app/app.selectors'
import { take } from 'rxjs/operators'
import { SegmentType } from 'src/app/pages/exchange/reducer'
import { TezosOperation } from '@airgap/tezos/v0/protocol/types/operations/TezosOperation'
import { TezosTransactionOperation } from '@airgap/tezos/v0/protocol/types/operations/Transaction'
import { RawTezosTransaction, TezosProtocol, TezosProtocolNetwork, TezosWrappedOperation } from '@airgap/tezos'
import { TezosAddressResult } from '@airgap/tezos/v0/protocol/types/TezosAddressResult'
import { TezosOperationType } from '@airgap/tezos/v0/protocol/types/TezosOperationType'

interface DexStorage {
  storage: {
    tez_pool: number
    token_pool: number

    token_address: string
    token_id: number
  }
}

type PartialTransactionOperation = TezosOperation & Partial<TezosTransactionOperation>

interface LiquidityTransaction {
  details: IAirGapTransaction[]
  unsigned: RawTezosTransaction
}

interface LiquiditySlippageTolerance {
  low: number
  medium: number
  high: number
}

class LiquidityTransactionStatusResponse implements ExchangeTransactionStatusResponse {
  constructor(public readonly status: string) {}

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

const XTZ_LIQUIDITY_IDENTIFIER: string = 'tez'

const LIQUIDITY_FEE: number = 0.003 // 0.3%

enum ControlId {
  SLIPPAGE_TOLERANCE = 'slippageTolerance',
  SLIPPAGE_TOLERANCE_CONTROL = 'slippageToleranceControl'
}

const DEX_CONTRACTS = {
  [SubProtocolSymbols.XTZ_BTC]: 'KT1WBLrLE2vG8SedBqiSJFm4VVAZZBytJYHc'
}

const DEX_ENTRYPOINTS = {
  tezToTokenPayment: 'tezToTokenPayment',
  tokenToTezPayment: 'tokenToTezPayment'
}

export class LiquidityExchange implements Exchange {
  private readonly identifierExchangeToAirGapMap: Map<ExchangeIdentifier, ProtocolSymbols> = new Map<ExchangeIdentifier, ProtocolSymbols>()
  private readonly identifierAirGapToExchangeMap: Map<ProtocolSymbols, ExchangeIdentifier> = new Map<ProtocolSymbols, ExchangeIdentifier>()

  private readonly dexContracts: Map<ProtocolSymbols, Contract> = new Map<ProtocolSymbols, Contract>()

  private readonly supportedTokens: ProtocolSymbols[] = Object.keys(DEX_CONTRACTS) as ProtocolSymbols[]
  private get supportedCurrencies(): ProtocolSymbols[] {
    return [MainProtocolSymbols.XTZ]
  }

  private liquidityTokenContractAddress = 'KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo'
  private liquidityBakingContractAddress = 'KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5'
  private tokenContractAddress = 'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn'
  private liquidityTokenContract: ContractAbstraction<ContractProvider>
  private liquidityBakingContract: ContractAbstraction<ContractProvider>
  private tokenContract: ContractAbstraction<ContractProvider>
  private tokenPool: number
  private xtzPool: number
  private lqtTotal: number
  private slippageTolerance: BigNumber
  private selectedWalletAddress: string

  private readonly tezos: TezosToolkit = new TezosToolkit(new TezosProtocolNetwork().rpcUrl)

  private readonly slippageDefaults: LiquiditySlippageTolerance = {
    low: 0.005, // 0.5%
    medium: 0.01, // 1%
    high: 0.03 // 3%
  }

  constructor(
    private readonly protocolService: ProtocolService,
    private readonly formBuilder: FormBuilder,
    private readonly store$: Store<fromExchange.State>
  ) {
    this.store$.select(getSelectedSlippage).subscribe((slippage) => {
      this.slippageTolerance = slippage
    })

    this.store$
      .select((state) => state.exchange.fromWallet)
      .subscribe((wallet) => {
        this.selectedWalletAddress = wallet?.addresses[0]
      })

    this.initIdentifierMappings(this.supportedTokens)
  }

  async initContracts() {
    if (this.tezos && this.liquidityBakingContract && this.liquidityTokenContract && this.tokenContract) {
      return
    }
    try {
      this.liquidityBakingContract = await this.tezos.contract.at(this.liquidityBakingContractAddress)
      this.liquidityTokenContract = await this.tezos.contract.at(this.liquidityTokenContractAddress)
      this.tokenContract = await this.tezos.contract.at(this.tokenContractAddress)

      const storageArgs =
        (<MichelsonV1ExpressionExtended>this.liquidityBakingContract.script.storage).args ?? this.liquidityBakingContract.script.storage

      this.tokenPool = new BigNumber((<MichelsonV1ExpressionBase>storageArgs[0]).int).toNumber()

      this.xtzPool = new BigNumber((<MichelsonV1ExpressionBase>storageArgs[1]).int).toNumber()

      this.lqtTotal = new BigNumber((<MichelsonV1ExpressionBase>storageArgs[2]).int).toNumber()
    } catch (error) {
      throw error
    }
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
        exchangeIdentifier = XTZ_LIQUIDITY_IDENTIFIER
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

    let shiftedAmount: BigNumber = new BigNumber(amount).shiftedBy(fromProtocol.decimals)

    const segmentType = await this.store$
      .select((state) => state.exchange.segmentType)
      .pipe(take(1))
      .toPromise()
    let minAmount: BigNumber
    if (segmentType === SegmentType.SWAP) {
      if (fromProtocol.identifier === MainProtocolSymbols.XTZ) {
        minAmount = await this.getExpectedMinimumReceivedToken(shiftedAmount, this.slippageTolerance)
      } else {
        minAmount = await this.getExpectedMinimumReceivedTez(shiftedAmount, this.slippageTolerance)
      }
    } else {
      minAmount = await this.getExpectedTokenIn(shiftedAmount, this.slippageTolerance)
    }
    return minAmount.shiftedBy(-toProtocol.decimals).toFixed()
  }

  async getExpectedTokenIn(mutezAmount: BigNumber, slippageTolerance: BigNumber): Promise<BigNumber> {
    await this.initContracts()

    const priceImpact = await this.xtzToTokenPriceImpact(mutezAmount)
    const adjustedSlippage = priceImpact.gt(slippageTolerance) ? priceImpact : slippageTolerance
    return new BigNumber(liquidityBakingCalculations.addLiquidityTokenIn(mutezAmount.toNumber(), this.xtzPool, this.tokenPool))
      .dividedBy(adjustedSlippage.minus(1).abs())
      .integerValue(BigNumber.ROUND_DOWN)
  }

  async getExpectedMinimumReceivedToken(mutezAmount: BigNumber, slippageTolerance: BigNumber): Promise<BigNumber> {
    await this.initContracts()

    const priceImpact = await this.xtzToTokenPriceImpact(mutezAmount)
    const adjustedSlippage = priceImpact.gt(slippageTolerance) ? priceImpact : slippageTolerance

    return new BigNumber(liquidityBakingCalculations.addLiquidityTokenIn(mutezAmount.toNumber(), this.xtzPool, this.tokenPool))
      .times(adjustedSlippage.minus(1).abs())
      .integerValue(BigNumber.ROUND_DOWN)
  }

  async getExpectedMinimumReceivedTez(tokenAmount: BigNumber, slippageTolerance: BigNumber): Promise<BigNumber> {
    await this.initContracts()

    const priceImpact = await this.tokenToXtzPriceImpact(tokenAmount)
    const adjustedSlippage = priceImpact.gt(slippageTolerance) ? priceImpact : slippageTolerance

    return new BigNumber(liquidityBakingCalculations.tokenToXtzXtzOutput(tokenAmount.toNumber(), this.xtzPool, this.tokenPool))
      .times(adjustedSlippage.minus(1).abs())
      .integerValue(BigNumber.ROUND_DOWN)
  }

  private async xtzToTokenPriceImpact(mutezAmount: BigNumber): Promise<BigNumber> {
    await this.initContracts()
    return new BigNumber(liquidityBakingCalculations.xtzToTokenPriceImpact(mutezAmount.toNumber(), this.xtzPool, this.tokenPool))
  }

  private async tokenToXtzPriceImpact(tokenAmount: BigNumber): Promise<BigNumber> {
    await this.initContracts()
    return new BigNumber(liquidityBakingCalculations.tokenToXtzPriceImpact(tokenAmount.toNumber(), this.xtzPool, this.tokenPool))
  }

  private async getMinTezToTokenExchangeAmount(
    token: ProtocolSymbols,
    mutezAmount: BigNumber,
    slippageTolerance: BigNumber
  ): Promise<BigNumber> {
    return this.getMinExchangeAmount(token, mutezAmount, slippageTolerance, { in: 'tez_pool', out: 'token_pool' })
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
    const expectedInPool: BigNumber = currentInPool.plus(amount.multipliedBy(1 - LIQUIDITY_FEE))
    const expectedOutPool: BigNumber = constantProduct.dividedBy(expectedInPool)

    return currentOutPool.minus(expectedOutPool).multipliedBy(slippageTolerance.minus(1).abs()).integerValue(BigNumber.ROUND_DOWN)
  }

  public async validateAddress(_currency: string, _address: string): Promise<{ result: false; message: string }> {
    return { result: false, message: '' }
  }

  public async estimateFee(fromWallet: AirGapMarketWallet, toWallet: AirGapMarketWallet, amount: string): Promise<FeeDefaults | undefined> {
    const feeDefaults = await this.estimateTransactionFee(
      fromWallet.publicKey,
      toWallet.protocol.identifier,
      amount,
      this.slippageTolerance,
      fromWallet.protocol.decimals
    )
    if (feeDefaults === undefined) {
      throw new Error(`Currency ${fromWallet.protocol.identifier} is not supported.`)
    }

    return feeDefaults
  }

  private async estimateTransactionFee(
    publicKey: string,
    token: ProtocolSymbols,
    amount: string,
    slippageTolerance: BigNumber,
    decimals: number
  ): Promise<FeeDefaults> {
    const shiftedAmount: BigNumber = new BigNumber(amount).shiftedBy(decimals)
    const tezosProtocol: TezosProtocol = await this.getTezosProtocol()
    const minTokenAmount: BigNumber = await this.getMinTezToTokenExchangeAmount(token, shiftedAmount, slippageTolerance)
    const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)

    const segmentType = await this.store$
      .select((state) => state.exchange.segmentType)
      .pipe(take(1))
      .toPromise()
    let operations: TezosOperation[]

    if (segmentType === SegmentType.REMOVE_LIQUIDITY) {
      operations = await this.prepareRemoveLiquidityOperation(publicKey, new BigNumber(amount), undefined, 6)
    } else if (segmentType === SegmentType.ADD_LIQUIDITY) {
      operations = await this.prepareTezToTokenOperations(address.address, address.address, token, shiftedAmount, minTokenAmount)
    }
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

    let minAmount: BigNumber = new BigNumber(0)
    let tokenProtocol: ICoinProtocol | undefined
    let transaction: LiquidityTransaction | undefined

    const segmentType = await this.store$
      .select((state) => state.exchange.segmentType)
      .pipe(take(1))
      .toPromise()

    if (segmentType === SegmentType.REMOVE_LIQUIDITY) {
      tokenProtocol = toWallet.protocol
      transaction = await this.generateRemoveLiquidityOperation(
        fromWallet.publicKey,
        tokenProtocol,
        new BigNumber(amount),
        shiftedFee,
        fromWallet.protocol.decimals
      )
    } else if (segmentType === SegmentType.SWAP) {
      // TODO JGD distinguish according to swap direction
      tokenProtocol = toWallet.protocol

      if (fromWallet.protocol.identifier === MainProtocolSymbols.XTZ) {
        minAmount = await this.getExpectedMinimumReceivedToken(shiftedAmount, this.slippageTolerance)
        transaction = await this.generateXtzToTokenSwapOperation(fromWallet.publicKey, tokenProtocol, shiftedAmount, minAmount, shiftedFee)
      } else {
        minAmount = await this.getExpectedMinimumReceivedTez(shiftedAmount, this.slippageTolerance) // TODO JGD NEXT we need the correct minAmount for the swap operation
        transaction = await this.generateTokenToXtzSwapOperation(fromWallet.publicKey, tokenProtocol, shiftedAmount, minAmount, shiftedFee)
      }
    } else {
      tokenProtocol = fromWallet.protocol
      minAmount = await this.getExpectedTokenIn(shiftedAmount, this.slippageTolerance)
      transaction = await this.generateAddLiquidityOperation(fromWallet.publicKey, tokenProtocol, shiftedAmount, minAmount, shiftedFee)
    }

    if (transaction === undefined) {
      throw new Error(`Currency ${fromWallet.protocol.identifier} is not supported.`)
    }

    return {
      payoutAddress: fromWallet.addresses[0],
      payinAddress: this.liquidityBakingContractAddress,
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

  private async generateAddLiquidityOperation(
    publicKey: string,
    tokenProtocol: ICoinProtocol,
    mutezAmount: BigNumber,
    minTokenAmount: BigNumber,
    fee: BigNumber
  ): Promise<LiquidityTransaction> {
    try {
      const tezosProtocol: TezosProtocol = await this.getTezosProtocol()

      const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)

      const minLqtMinted = new BigNumber(
        liquidityBakingCalculations.addLiquidityLiquidityCreated(mutezAmount.toNumber(), this.xtzPool, this.lqtTotal)
      )

      const addLiquidityParams = this.liquidityBakingContract.methods
        .addLiquidity(address.address, minLqtMinted, minTokenAmount, this.deadline())
        .toTransferParams()

      const addLiquidityRequest = {
        fee: fee.toString(),
        kind: 'transaction',
        source: address.address,
        amount: new BigNumber(mutezAmount).toString(),
        destination: this.liquidityBakingContractAddress,
        parameters: addLiquidityParams.parameter
      } as PartialTransactionOperation

      const operations: TezosOperation[] = [
        this.approveRequest(address.address, 0, fee),
        this.approveRequest(address.address, minTokenAmount.toNumber(), fee),
        addLiquidityRequest,
        this.approveRequest(address.address, 0, fee)
      ]

      const wrappedOperations: TezosWrappedOperation = await tezosProtocol.prepareOperations(publicKey, operations, false)
      const transaction: RawTezosTransaction = await tezosProtocol.forgeAndWrapOperations(wrappedOperations)
      const details: IAirGapTransaction[] = await tokenProtocol.getTransactionDetails({ publicKey, transaction })

      return { details, unsigned: transaction }
    } catch (error) {
      throw error
    }
  }

  private async generateRemoveLiquidityOperation(
    publicKey: string,
    tokenProtocol: ICoinProtocol,
    liquidityAmount: BigNumber,
    fee: BigNumber,
    decimals: number
  ): Promise<LiquidityTransaction> {
    try {
      const tezosProtocol: TezosProtocol = await this.getTezosProtocol()
      const operations = await this.prepareRemoveLiquidityOperation(publicKey, liquidityAmount, fee, decimals)

      const wrappedOperations: TezosWrappedOperation = await tezosProtocol.prepareOperations(publicKey, operations, false)
      const transaction: RawTezosTransaction = await tezosProtocol.forgeAndWrapOperations(wrappedOperations)
      const details: IAirGapTransaction[] = await tokenProtocol.getTransactionDetails({ publicKey, transaction })

      return { details, unsigned: transaction }
    } catch (error) {
      throw error
    }
  }

  private async prepareRemoveLiquidityOperation(
    publicKey: string,
    liquidityAmount: BigNumber,
    fee: BigNumber,
    _decimals: number
  ): Promise<TezosOperation[]> {
    const tezosProtocol: TezosProtocol = await this.getTezosProtocol()
    const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)
    const [xtzOut, tokensOut] = await this.getCustomData(liquidityAmount)

    const removeLiquidityParams = this.liquidityBakingContract.methods
      .removeLiquidity(address.address, liquidityAmount, xtzOut, tokensOut, this.deadline())
      .toTransferParams()

    return [
      {
        fee: fee?.toString(),
        kind: 'transaction',
        source: address.address,
        amount: '0',
        destination: this.liquidityBakingContractAddress,
        parameters: removeLiquidityParams.parameter
      } as PartialTransactionOperation
    ]
  }
  private async generateXtzToTokenSwapOperation(
    publicKey: string,
    tokenProtocol: ICoinProtocol,
    mutezAmount: BigNumber,
    minTokenAmount: BigNumber,
    fee: BigNumber
  ): Promise<LiquidityTransaction> {
    try {
      const tezosProtocol: TezosProtocol = await this.getTezosProtocol()
      const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)

      let xtzToTokenParams = this.liquidityBakingContract.methods
        .xtzToToken(address.address, minTokenAmount, this.deadline())
        .toTransferParams()

      const operations = [
        {
          fee: fee.toString(),
          kind: 'transaction',
          source: address.address,
          amount: new BigNumber(mutezAmount).toString(),
          destination: this.liquidityBakingContractAddress,
          parameters: xtzToTokenParams.parameter
        }
      ] as PartialTransactionOperation[]

      const wrappedOperations: TezosWrappedOperation = await tezosProtocol.prepareOperations(publicKey, operations, false)
      const transaction: RawTezosTransaction = await tezosProtocol.forgeAndWrapOperations(wrappedOperations)
      const details: IAirGapTransaction[] = await tokenProtocol.getTransactionDetails({ publicKey, transaction })

      return { details, unsigned: transaction }
    } catch (error) {
      throw error
    }
  }

  private async generateTokenToXtzSwapOperation(
    publicKey: string,
    tokenProtocol: ICoinProtocol,
    tokenAmount: BigNumber,
    minMutezAmount: BigNumber,
    fee: BigNumber
  ): Promise<LiquidityTransaction> {
    try {
      const tezosProtocol: TezosProtocol = await this.getTezosProtocol()
      const address: TezosAddressResult = await tezosProtocol.getAddressFromPublicKey(publicKey)

      let tokenToXtzParams = this.liquidityBakingContract.methods
        .tokenToXtz(address.address, tokenAmount, minMutezAmount, this.deadline())
        .toTransferParams()

      const operations = [
        this.approveRequest(address.address, tokenAmount.toNumber(), fee),
        {
          kind: 'transaction',
          source: address.address,
          amount: '0',
          destination: this.liquidityBakingContractAddress,
          parameters: tokenToXtzParams.parameter
        }
      ] as PartialTransactionOperation[]

      const wrappedOperations: TezosWrappedOperation = await tezosProtocol.prepareOperations(publicKey, operations, false)
      const transaction: RawTezosTransaction = await tezosProtocol.forgeAndWrapOperations(wrappedOperations)
      const details: IAirGapTransaction[] = await tokenProtocol.getTransactionDetails({ publicKey, transaction })

      return { details, unsigned: transaction }
    } catch (error) {
      throw error
    }
  }

  private deadline() {
    return new BigNumber(Date.now())
      .dividedToIntegerBy(1000)
      .plus(60 * 60)
      .toString()
  }

  private approveRequest(address: string, tokenAmount: number, fee: BigNumber): PartialTransactionOperation {
    const approveParams = this.tokenContract.methods.approve(this.liquidityBakingContractAddress, tokenAmount).toTransferParams()

    return {
      fee: fee.toString(),
      kind: TezosOperationType.TRANSACTION,
      source: address,
      amount: '0',
      destination: this.tokenContractAddress,
      parameters: approveParams.parameter
    } as PartialTransactionOperation
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

  public async getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse> {
    const tezosProtocol = await this.getTezosProtocol()
    try {
      const transactionStatuses: AirGapTransactionStatus[] = await tezosProtocol.getTransactionStatuses([transactionId])
      const transactionStatus: AirGapTransactionStatus = transactionStatuses[0]

      return new LiquidityTransactionStatusResponse(transactionStatus)
    } catch {
      return new LiquidityTransactionStatusResponse('not_injected')
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
    const defaultSlippageTolerance: keyof LiquiditySlippageTolerance = 'low'
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

  public async getCustomData(input: boolean): Promise<BigNumber>
  public async getCustomData(input: BigNumber): Promise<BigNumber[]>
  public async getCustomData(input: boolean | BigNumber): Promise<BigNumber | BigNumber[]> {
    await this.initContracts()

    if (typeof input === 'string') {
      // LB token balance
      const storage: any = await this.liquidityTokenContract.storage()
      return new BigNumber(await storage.tokens.get(this.selectedWalletAddress)).shiftedBy(6) ?? new BigNumber(0)
    }

    const tezOut = (await this.getLiquidityBurnXtzOut(input.toString())).integerValue(BigNumber.ROUND_DOWN)

    const tokensOut = (await this.getLiquidityBurnTokensOut(input.toString())).integerValue(BigNumber.ROUND_DOWN)
    return [tezOut, tokensOut]
  }

  async getLiquidityBurnXtzOut(lqtBurned: string): Promise<BigNumber> {
    await this.initContracts()

    return new BigNumber(liquidityBakingCalculations.removeLiquidityXtzOut(lqtBurned, this.lqtTotal, this.xtzPool)).multipliedBy(
      this.slippageTolerance.minus(1).abs()
    )
  }

  async getLiquidityBurnTokensOut(lqtBurned: string): Promise<BigNumber> {
    await this.initContracts()
    return new BigNumber(liquidityBakingCalculations.removeLiquidityTokenOut(lqtBurned, this.lqtTotal, this.tokenPool)).multipliedBy(
      this.slippageTolerance.minus(1).abs()
    )
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

  // private async xtzToTokenPriceImpact(mutezAmount: BigNumber): Promise<BigNumber> {
  //   await this.initContracts()
  //   return new BigNumber(
  //     liquidityBakingCalculations.xtzToTokenPriceImpact(mutezAmount, this.xtzPool, this.tokenPool)(mutezAmount.toNumber())
  //   ).times(100)
  // }
}
