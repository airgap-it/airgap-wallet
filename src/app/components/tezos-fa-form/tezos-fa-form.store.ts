import {
  /* FilesystemService, */

  convertNetworkV0ToV1,
  createV0TezosFA1p2Protocol,
  createV0TezosFA2Protocol,
  ICoinSubProtocolAdapter,
  ProtocolService,
  UIResourceStatus
} from '@airgap/angular-core'
import { ICoinProtocol, MainProtocolSymbols, ProtocolNetwork } from '@airgap/coinlib-core'
import { protocolNetworkIdentifier } from '@airgap/module-kit'
import {
  isTezosFA1p2Protocol,
  isTezosFA2Protocol,
  isTezosFAProtocol,
  TezosContract,
  TezosContractMetadata,
  TezosFA1p2Protocol,
  TezosFA1p2ProtocolNetwork,
  TezosFA2Protocol,
  TezosFA2ProtocolNetwork,
  TezosFAProtocol,
  TezosFATokenMetadata,
  TezosProtocolNetwork
} from '@airgap/tezos'
import { TezosFA2ProtocolConfig, TezosFAProtocolConfig } from '@airgap/tezos/v0'
import { Injectable } from '@angular/core'
import { ComponentStore, tapResponse } from '@ngrx/component-store'
import { from, Observable, Subscriber } from 'rxjs'
import { repeat, switchMap, withLatestFrom } from 'rxjs/operators'

import { faProtocolSymbol } from '../../types/GenericProtocolSymbols'

import { TezosFAFormErrorType, TezosFAFormState, TokenDetailsInput, TokenInterface } from './tezos-fa-form.types'
import {
  contractNotFoundError,
  hasTokenInterface,
  interfaceUnknownError,
  isTezosFAFormError,
  tokenMetadataMissingError,
  tokenVaugeError,
  unknownError
} from './tezos-fa-form.utils'

const initialState: TezosFAFormState = {
  tokenInterface: { status: UIResourceStatus.IDLE, value: undefined },
  tokenId: { status: UIResourceStatus.IDLE, value: undefined },

  tokenInterfaces: [],
  tokens: [],
  networks: [],

  protocol: { status: UIResourceStatus.IDLE, value: undefined },

  errorDescription: undefined
}

@Injectable()
export class TezosFAFormStore extends ComponentStore<TezosFAFormState> {
  private readonly contractMetadata: Record<string, TezosContractMetadata> = {}
  private readonly tokenMetadata: Record<string, Record<number, TezosFATokenMetadata>> = {}

  public constructor(private readonly protocolService: ProtocolService /*, private readonly filesystemService: FilesystemService */) {
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

  public selectFromState<K extends keyof TezosFAFormState>(key: K): Observable<TezosFAFormState[K]> {
    return this.select((state) => state[key])
  }

  private readonly updateWithValue = this.updater((state: TezosFAFormState, partialState: Partial<TezosFAFormState>) => {
    return {
      ...state,
      ...partialState,
      errorDescription: undefined
    }
  })

  private readonly updateWithError = this.updater((state: TezosFAFormState, error: unknown) => {
    const tezosFAFormError = isTezosFAFormError(error) ? error : unknownError(error)

    if (tezosFAFormError.type === TezosFAFormErrorType.UNKNOWN && tezosFAFormError.error) {
      console.error(error)
    }

    return {
      ...state,
      tokenInterface:
        tezosFAFormError.type === TezosFAFormErrorType.INTERFACE_UNKNOWN
          ? { status: UIResourceStatus.ERROR, value: undefined }
          : tezosFAFormError.type === TezosFAFormErrorType.CONTRACT_NOT_FOUND
          ? { status: UIResourceStatus.IDLE, value: undefined }
          : state.tokenInterface,
      tokenId:
        tezosFAFormError.type === TezosFAFormErrorType.CONTRACT_NOT_FOUND
          ? { status: UIResourceStatus.IDLE, value: undefined }
          : state.tokenId,
      tokenInterfaces:
        tezosFAFormError.type === TezosFAFormErrorType.INTERFACE_UNKNOWN
          ? tezosFAFormError.tokenInterfaces
          : tezosFAFormError.type === TezosFAFormErrorType.CONTRACT_NOT_FOUND
          ? []
          : state.tokenInterfaces,
      tokens:
        tezosFAFormError.type === TezosFAFormErrorType.TOKEN_VAGUE
          ? tezosFAFormError.tokens
          : tezosFAFormError.type === TezosFAFormErrorType.CONTRACT_NOT_FOUND
          ? []
          : state.tokens,
      protocol: { status: UIResourceStatus.ERROR, value: state.protocol.value },
      errorDescription: `tezos-fa-form.error.${tezosFAFormError.type}`
    }
  })

  private async initAsync(): Promise<Partial<TezosFAFormState>> {
    const networks = await this.protocolService.getNetworksForProtocol(MainProtocolSymbols.XTZ)

    return {
      networks: networks.map(convertNetworkV0ToV1) as TezosProtocolNetwork[]
    }
  }

  private fetchTokenDetails(state: TezosFAFormState, inputDetails: TokenDetailsInput): Observable<Partial<TezosFAFormState>> {
    return new Observable((subscriber: Subscriber<Partial<TezosFAFormState>>) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      new Promise<void>(async (resolve, reject) => {
        try {
          this.emitLoading(subscriber)

          const alreadySupported = await this.alreadySupported(inputDetails.address, inputDetails.networkIdentifier, inputDetails.tokenId)
          if (alreadySupported) {
            const handledAlreadySupported = await this.handleAlreadySupported(alreadySupported, inputDetails.tokenId)

            await Promise.all([
              this.tapProtocol(handledAlreadySupported),
              this.emitProtocol(handledAlreadySupported, inputDetails.tokenInterface, inputDetails.tokenId, subscriber)
            ])
            resolve()

            return
          }

          const network = state.networks.find(
            (network: TezosProtocolNetwork) => protocolNetworkIdentifier(network) === inputDetails.networkIdentifier
          )
          let contract: TezosContract | undefined
          if (network) {
            contract = await this.getContract(inputDetails.address, network)
          }
          this.emitContract(contract, subscriber)

          const tokenInterface: TokenInterface | undefined = await this.getTokenInterface(contract, inputDetails.tokenInterface)
          this.emitTokenInterface(tokenInterface, subscriber)

          let protocol: ICoinSubProtocolAdapter<TezosFAProtocol>
          switch (tokenInterface) {
            case TokenInterface.FA1p2:
              protocol = await this.getFA1p2TokenDetails(contract)
              break
            case TokenInterface.FA2:
              protocol = await this.getFA2TokenDetails(contract, inputDetails.tokenId)
              break
            default:
              throw interfaceUnknownError()
          }

          await this.emitProtocol(protocol, inputDetails.tokenInterface, inputDetails.tokenId, subscriber)
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

  private async alreadySupported(
    address: string,
    networkIdentifier: string,
    tokenID?: number
  ): Promise<ICoinSubProtocolAdapter<TezosFAProtocol> | undefined> {
    const subProtocols = await this.protocolService.getSubProtocols(MainProtocolSymbols.XTZ)
    const alreadySupportedProtocols = subProtocols.filter((protocol): protocol is ICoinSubProtocolAdapter<TezosFAProtocol> => {
      return (
        protocol instanceof ICoinSubProtocolAdapter &&
        isTezosFAProtocol(protocol.protocolV1) &&
        protocol.contractAddress === address &&
        protocol.options.network.identifier === networkIdentifier
      )
    })

    const alreadySupportedTokens = await Promise.all(
      alreadySupportedProtocols.map(async (protocol) => {
        if (isTezosFA2Protocol(protocol.protocolV1) && (await protocol.protocolV1.getTokenId()) === tokenID) {
          return protocol as ICoinSubProtocolAdapter<TezosFA2Protocol>
        } else {
          return undefined
        }
      })
    )

    return alreadySupportedTokens.find((token) => token !== undefined) ?? alreadySupportedProtocols[0]
  }

  private async handleAlreadySupported(
    adapter: ICoinSubProtocolAdapter<TezosFAProtocol>,
    tokenID?: number
  ): Promise<ICoinSubProtocolAdapter<TezosFAProtocol>> {
    if (isTezosFA2Protocol(adapter.protocolV1)) {
      return this.handleFA2AlreadySupported(adapter as ICoinSubProtocolAdapter<TezosFA2Protocol>, tokenID)
    } else {
      return adapter
    }
  }

  private async handleFA2AlreadySupported(
    adapter: ICoinSubProtocolAdapter<TezosFA2Protocol>,
    customTokenID?: number
  ): Promise<ICoinSubProtocolAdapter<TezosFA2Protocol>> {
    if (customTokenID !== undefined && (await adapter.protocolV1.getTokenId()) === customTokenID) {
      return adapter
    }

    try {
      return this.createFA2Protocol(adapter.protocolV1, customTokenID)
    } catch (error) {
      if (isTezosFAFormError(error) && error.type === TezosFAFormErrorType.TOKEN_METADATA_MISSING) {
        return adapter
      } else {
        throw error
      }
    }
  }

  private async getContract(address: string, network: TezosProtocolNetwork): Promise<TezosContract | undefined> {
    const contract = new TezosContract(address, network)

    try {
      // get contract's balance to verify if the address and network are valid
      await contract.balance()
      return contract
    } catch {
      return undefined
    }
  }

  private async getTokenInterface(contract: TezosContract, tokenInterface?: TokenInterface): Promise<TokenInterface | undefined> {
    if (!tokenInterface) {
      const metadata = await this.getContractMetadata(contract)
      if (!metadata) {
        return undefined
      }

      if (hasTokenInterface(metadata, TokenInterface.FA1p2)) {
        return TokenInterface.FA1p2
      } else if (hasTokenInterface(metadata, TokenInterface.FA2)) {
        return TokenInterface.FA2
      }
    }

    return tokenInterface
  }

  private async getFA1p2TokenDetails(contract: TezosContract): Promise<ICoinSubProtocolAdapter<TezosFA1p2Protocol>> {
    const genericFA1p2Adapter: ICoinSubProtocolAdapter<TezosFA1p2Protocol> = await createV0TezosFA1p2Protocol({
      network: {
        ...contract.network,
        contractAddress: contract.address
      },
      identifier: faProtocolSymbol('1.2', contract.address)
    })

    const tokenMetadata = await this.getFA1p2TokenMetadata(genericFA1p2Adapter.protocolV1)
    if (!tokenMetadata) {
      throw tokenMetadataMissingError()
    }

    const network: TezosFA1p2ProtocolNetwork = await genericFA1p2Adapter.protocolV1.getNetwork()

    const protocol: ICoinSubProtocolAdapter<TezosFA1p2Protocol> = await createV0TezosFA1p2Protocol({
      network,
      identifier: faProtocolSymbol('1.2', contract.address),
      name: tokenMetadata.name,
      units: {
        [tokenMetadata.symbol]: {
          symbol: { value: tokenMetadata.symbol },
          decimals: tokenMetadata.decimals
        }
      },
      mainUnit: tokenMetadata.symbol
    })

    // for backwards compatibility in app.component
    protocol.options.config = new TezosFAProtocolConfig(
      network.contractAddress,
      protocol.identifier,
      tokenMetadata.symbol,
      tokenMetadata.name,
      tokenMetadata.symbol,
      protocol.feeDefaults,
      tokenMetadata.decimals,
      network.tokenMetadataBigMapId
    )

    await this.tapProtocol(protocol, tokenMetadata)

    return protocol
  }

  private async getFA2TokenDetails(
    contract: TezosContract,
    customTokenId: number | undefined
  ): Promise<ICoinSubProtocolAdapter<TezosFA2Protocol>> {
    const genericFA2Adapter: ICoinSubProtocolAdapter<TezosFA2Protocol> = await createV0TezosFA2Protocol({
      network: {
        ...contract.network,
        contractAddress: contract.address,
        tokenId: customTokenId
      },
      identifier: faProtocolSymbol('2', contract.address, customTokenId)
    })

    return this.createFA2Protocol(genericFA2Adapter.protocolV1, customTokenId)
  }

  private async createFA2Protocol(
    baseProtocol: TezosFA2Protocol,
    customTokenId: number | undefined
  ): Promise<ICoinSubProtocolAdapter<TezosFA2Protocol>> {
    const tokenMetadataRegistry = await this.getFA2TokenMetadata(baseProtocol)
    if (!tokenMetadataRegistry) {
      throw tokenMetadataMissingError()
    }

    const tokenMetadataRegistryEntries = Object.entries(tokenMetadataRegistry)
    const [tokenId, tokenMetadata] =
      customTokenId !== undefined
        ? [customTokenId, tokenMetadataRegistry[customTokenId]]
        : tokenMetadataRegistryEntries.length === 1
        ? [parseInt(tokenMetadataRegistryEntries[0][0]), tokenMetadataRegistryEntries[0][1]]
        : [undefined, undefined]

    if (tokenId === undefined) {
      throw tokenVaugeError(tokenMetadataRegistry)
    }
    if (tokenMetadata === undefined) {
      throw tokenMetadataMissingError()
    }

    const network: TezosFA2ProtocolNetwork = await baseProtocol.getNetwork()

    const protocol: ICoinSubProtocolAdapter<TezosFA2Protocol> = await createV0TezosFA2Protocol({
      network: {
        ...network,
        tokenId
      },
      identifier: faProtocolSymbol('2', network.contractAddress, tokenId),
      name: tokenMetadata.name,
      units: {
        [tokenMetadata.symbol]: {
          symbol: { value: tokenMetadata.symbol },
          decimals: tokenMetadata.decimals
        }
      },
      mainUnit: tokenMetadata.symbol
    })

    // for backwards compatibility in app.component
    protocol.options.config = new TezosFA2ProtocolConfig(
      network.contractAddress,
      protocol.identifier,
      tokenMetadata.symbol,
      tokenMetadata.name,
      tokenMetadata.symbol,
      protocol.feeDefaults,
      tokenMetadata.decimals,
      tokenId,
      network.tokenMetadataBigMapId,
      network.ledgerBigMapId,
      network.totalSupplyBigMapId
    )

    await this.tapProtocol(protocol, tokenMetadata)

    return protocol
  }

  private emitLoading(subscriber: Subscriber<Partial<TezosFAFormState>>): void {
    subscriber.next({
      tokenId: { status: UIResourceStatus.LOADING, value: undefined },
      tokenInterface: { status: UIResourceStatus.LOADING, value: undefined },
      protocol: { status: UIResourceStatus.LOADING, value: undefined }
    })
  }

  private async emitProtocol(
    adapter: ICoinSubProtocolAdapter<TezosFAProtocol>,
    tokenInterface: TokenInterface | undefined,
    tokenId: number | undefined,
    subscriber: Subscriber<Partial<TezosFAFormState>>
  ): Promise<void> {
    subscriber.next({
      tokenId:
        tokenId !== undefined
          ? { status: UIResourceStatus.SUCCESS, value: tokenId }
          : isTezosFA2Protocol(adapter.protocolV1)
          ? { status: UIResourceStatus.SUCCESS, value: await adapter.protocolV1.getTokenId() }
          : { status: UIResourceStatus.SUCCESS, value: 0 },
      tokenInterface: {
        status: UIResourceStatus.SUCCESS,
        value: isTezosFA1p2Protocol(adapter.protocolV1)
          ? TokenInterface.FA1p2
          : isTezosFA2Protocol(adapter.protocolV1)
          ? TokenInterface.FA2
          : undefined
      },
      protocol: { status: UIResourceStatus.SUCCESS, value: adapter },
      ...(tokenInterface === undefined ? { tokenInterfaces: [] } : {}),
      ...(tokenId === undefined ? { tokens: [] } : {})
    })
  }

  private emitContract(contract: TezosContract | undefined, _subscriber: Subscriber<Partial<TezosFAFormState>>): void {
    if (!contract) {
      throw contractNotFoundError()
    }
  }

  private emitTokenInterface(tokenInterface: TokenInterface | undefined, subscriber: Subscriber<Partial<TezosFAFormState>>): void {
    if (!tokenInterface) {
      throw interfaceUnknownError()
    }

    subscriber.next({
      tokenInterface: { status: UIResourceStatus.SUCCESS, value: tokenInterface }
    })
  }

  private async getContractMetadata(contract: TezosContract): Promise<TezosContractMetadata | undefined> {
    if (!this.contractMetadata[contract.address]) {
      const networks = await this.protocolService.getNetworksForProtocol(MainProtocolSymbols.XTZ)
      this.contractMetadata[contract.address] = await contract.metadata((network: string) => {
        return networks
          .map((protocolNetwork: ProtocolNetwork) => convertNetworkV0ToV1(protocolNetwork) as TezosProtocolNetwork)
          .find((protocolNetwork: TezosProtocolNetwork) => protocolNetwork.network === network)
      })
    }

    return this.contractMetadata[contract.address]
  }

  private async getFA1p2TokenMetadata(protocol: TezosFA1p2Protocol): Promise<TezosFATokenMetadata | undefined> {
    const tokenMetadata = await this.getFATokenMetadata(protocol)
    return tokenMetadata[0]
  }

  private async getFA2TokenMetadata(protocol: TezosFA2Protocol): Promise<Record<number, TezosFATokenMetadata> | undefined> {
    const contractAddress: string = await protocol.getContractAddress()
    if (!this.tokenMetadata[contractAddress]) {
      const allTokenMetadata = await protocol.getAllTokenMetadata()
      if (!allTokenMetadata) {
        return undefined
      }

      await Promise.all(
        Object.entries(allTokenMetadata).map(async ([tokenId, tokenMetadata]) => {
          this.tokenMetadata[contractAddress] = Object.assign(this.tokenMetadata[contractAddress] ?? {}, {
            [tokenId]: tokenMetadata
          })
        })
      )
    }

    return this.tokenMetadata[contractAddress]
  }

  private async getFATokenMetadata(
    protocol: TezosFA1p2Protocol | TezosFA2Protocol,
    tokenId?: number
  ): Promise<Record<number, TezosFATokenMetadata> | undefined> {
    const contractAddress: string = await protocol.getContractAddress()
    tokenId = tokenId ?? (isTezosFA2Protocol(protocol) ? await protocol.getTokenId() : undefined)
    tokenId = tokenId ?? 0
    if (!this.tokenMetadata[contractAddress] || !this.tokenMetadata[contractAddress][tokenId]) {
      this.tokenMetadata[contractAddress] = Object.assign(this.tokenMetadata[contractAddress] ?? {}, {
        [tokenId]: await protocol.getTokenMetadata()
      })
    }

    return this.tokenMetadata[contractAddress]
  }

  private async tapProtocol(adapter: ICoinSubProtocolAdapter<TezosFAProtocol>, tokenMetadata?: TezosFATokenMetadata): Promise<void> {
    if (tokenMetadata === undefined) {
      if (isTezosFA1p2Protocol(adapter.protocolV1)) {
        tokenMetadata = await adapter.protocolV1.getTokenMetadata()
      } else if (isTezosFA2Protocol(adapter.protocolV1)) {
        tokenMetadata = await adapter.protocolV1.getTokenMetadata()
      }
    }

    if (tokenMetadata) {
      await this.tapTokenMetadata(adapter, tokenMetadata)
    }
  }

  private async tapTokenMetadata(_protocol: ICoinProtocol, _tokenMetadata: TezosFATokenMetadata): Promise<void> {
    // const thumbnailUri = tokenMetadata.thumbnailUri
    // if (typeof thumbnailUri === 'string') {
    //   await this.filesystemService.writeLazyImage(`/images/symbols/${protocol.identifier}`, thumbnailUri.trim())
    // }
  }
}
