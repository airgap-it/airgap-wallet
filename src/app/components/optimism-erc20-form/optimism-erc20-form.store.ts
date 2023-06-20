import {
  convertNetworkV0ToV1,
  createV0OptimismERC20Token,
  ICoinSubProtocolAdapter,
  ProtocolService,
  UIResourceStatus
} from '@airgap/angular-core'
import { ICoinProtocol, MainProtocolSymbols } from '@airgap/coinlib-core'
import { ERC20TokenMetadata } from '@airgap/ethereum'
import { protocolNetworkIdentifier } from '@airgap/module-kit'
import { ERC20Token, isOptimismERC20Token, OptimismModule, OptimismProtocolNetwork } from '@airgap/optimism'

import { Injectable } from '@angular/core'
import { ComponentStore, tapResponse } from '@ngrx/component-store'
import { from, Observable, Subscriber } from 'rxjs'
import { repeat, switchMap, withLatestFrom } from 'rxjs/operators'
import { optimismERC20ProtocolSymbol } from 'src/app/types/GenericProtocolSymbols'

import { OptimismERC20FormErrorType, OptimismERC20FormState, TokenDetailsInput } from './optimism-erc20-form.types'
import { isOptimismERC20FormError, tokenMetadataMissingError, unknownError } from './optimism-erc20-form.utils'

const initialState: OptimismERC20FormState = {
  networks: [],
  protocol: { status: UIResourceStatus.IDLE, value: undefined },

  errorDescription: undefined
}

@Injectable()
export class OptimismERC20FormStore extends ComponentStore<OptimismERC20FormState> {
  public constructor(private readonly protocolService: ProtocolService) {
    super(initialState)
  }

  public readonly onInit$ = this.effect(() => {
    return from(this.initAsync()).pipe(
      tapResponse(
        (partialState) => this.updateWithValue(partialState),
        (error) => this.updateWithError(error)
      )
    )
  })

  public readonly onTokenDetailsInput$ = this.effect((details$: Observable<TokenDetailsInput>) => {
    return details$.pipe(
      withLatestFrom(this.state$),
      switchMap(([details, state]) => {
        return this.fetchTokenDetails(state, details).pipe(
          tapResponse(
            (partialState) => this.updateWithValue(partialState),
            (error) => this.updateWithError(error)
          )
        )
      }),
      repeat()
    )
  })

  public selectFromState<K extends keyof OptimismERC20FormState>(key: K): Observable<OptimismERC20FormState[K]> {
    return this.select((state) => state[key])
  }

  private readonly updateWithValue = this.updater((state: OptimismERC20FormState, partialState: Partial<OptimismERC20FormState>) => {
    return {
      ...state,
      ...partialState,
      errorDescription: undefined
    }
  })

  private readonly updateWithError = this.updater((state: OptimismERC20FormState, error: unknown) => {
    const optimismERC20FormError = isOptimismERC20FormError(error) ? error : unknownError(error)

    if (optimismERC20FormError.type === OptimismERC20FormErrorType.UNKNOWN && optimismERC20FormError.error) {
      console.error(error)
    }

    return {
      ...state,
      protocol: { status: UIResourceStatus.ERROR, value: state.protocol.value },
      errorDescription: `optimism-erc20-form.error.${optimismERC20FormError.type}`
    }
  })

  private async initAsync(): Promise<Partial<OptimismERC20FormState>> {
    const networks = await this.protocolService.getNetworksForProtocol(MainProtocolSymbols.OPTIMISM)

    return {
      networks: networks.map(convertNetworkV0ToV1) as OptimismProtocolNetwork[]
    }
  }

  private fetchTokenDetails(state: OptimismERC20FormState, inputDetails: TokenDetailsInput): Observable<Partial<OptimismERC20FormState>> {
    return new Observable((subscriber: Subscriber<Partial<OptimismERC20FormState>>) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      new Promise<void>(async (resolve, reject) => {
        try {
          this.emitLoading(subscriber)

          const alreadySupported = await this.alreadySupported(inputDetails.address, inputDetails.networkIdentifier)
          if (alreadySupported) {
            this.emitProtocol(alreadySupported, subscriber)
            resolve()

            return
          }

          const network = state.networks.find(
            (network: OptimismProtocolNetwork) => protocolNetworkIdentifier(network) === inputDetails.networkIdentifier
          )
          const protocol: ICoinSubProtocolAdapter<ERC20Token> = await this.getERC20TokenDetails(inputDetails.address, network)

          this.emitProtocol(protocol, subscriber)
        } catch (error) {
          reject(error)
        }
      })
        .catch((error) => {
          subscriber.error(error)
        })
        .finally(() => {
          subscriber.complete()
        })
    })
  }

  private async alreadySupported(address: string, networkIdentifier: string): Promise<ICoinProtocol | undefined> {
    const subProtocols = await this.protocolService.getSubProtocols(MainProtocolSymbols.OPTIMISM)
    const alreadySupportedProtocols = subProtocols.filter((protocol): protocol is ICoinSubProtocolAdapter<ERC20Token> => {
      return (
        protocol instanceof ICoinSubProtocolAdapter &&
        isOptimismERC20Token(protocol.protocolV1) &&
        protocol.contractAddress === address &&
        protocol.options.network.identifier === networkIdentifier
      )
    })

    return alreadySupportedProtocols[0]
  }

  private async getERC20TokenDetails(
    contractAddress: string,
    network: OptimismProtocolNetwork
  ): Promise<ICoinSubProtocolAdapter<ERC20Token>> {
    const genericERC20Token: ICoinSubProtocolAdapter<ERC20Token> = await createV0OptimismERC20Token(
      {
        contractAddress,
        identifier: optimismERC20ProtocolSymbol(contractAddress),
        name: 'Optimism ERC20',
        symbol: 'OP-ERC20',
        marketSymbol: 'OP-ERC20',
        decimals: 0
      },
      { network }
    )

    const tokenMetadata: ERC20TokenMetadata | undefined = await this.getERC20TokenMetadata(genericERC20Token.protocolV1)
    if (!tokenMetadata) {
      throw tokenMetadataMissingError()
    }

    const tokenNetwork: OptimismProtocolNetwork = await genericERC20Token.protocolV1.getNetwork()

    const erc20Token: ICoinSubProtocolAdapter<ERC20Token> = await createV0OptimismERC20Token(tokenMetadata, { network: tokenNetwork })

    // TODO: move serialization to more generic context, e.g. ModuleService
    const optimismModule = new OptimismModule()
    erc20Token.options.config = await optimismModule.serializeOnlineProtocol(erc20Token.protocolV1)

    return erc20Token
  }

  private async getERC20TokenMetadata(protocol: ERC20Token): Promise<ERC20TokenMetadata | undefined> {
    const [contractAddress, name, symbol, decimals]: [
      string,
      string | undefined,
      string | undefined,
      number | undefined
    ] = await Promise.all([protocol.getContractAddress(), protocol.name(), protocol.symbol(), protocol.decimals()])

    if (name === undefined || symbol === undefined || decimals === undefined) {
      return undefined
    }

    return {
      contractAddress,
      identifier: optimismERC20ProtocolSymbol(contractAddress),
      name,
      symbol,
      marketSymbol: symbol.toLowerCase(),
      decimals
    }
  }

  private emitLoading(subscriber: Subscriber<Partial<OptimismERC20FormState>>): void {
    subscriber.next({
      protocol: { status: UIResourceStatus.LOADING, value: undefined }
    })
  }

  private emitProtocol(protocol: ICoinProtocol, subscriber: Subscriber<Partial<OptimismERC20FormState>>): void {
    subscriber.next({
      protocol: { status: UIResourceStatus.SUCCESS, value: protocol }
    })
  }
}
