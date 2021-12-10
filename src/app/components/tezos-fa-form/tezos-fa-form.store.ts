import { /* FilesystemService, */ ProtocolService, UIResourceStatus } from '@airgap/angular-core'
import {
  ICoinProtocol,
  MainProtocolSymbols,
  ProtocolNetwork,
  TezosFA1p2Protocol,
  TezosFA2Protocol,
  TezosFA2ProtocolConfig,
  TezosFA2ProtocolOptions,
  TezosFAProtocolConfig,
  TezosFAProtocolOptions,
  TezosProtocolOptions
} from '@airgap/coinlib-core'
import { TezosContract } from '@airgap/coinlib-core/protocols/tezos/contract/TezosContract'
import { TezosProtocolNetwork } from '@airgap/coinlib-core/protocols/tezos/TezosProtocolOptions'
import { TezosContractMetadata } from '@airgap/coinlib-core/protocols/tezos/types/contract/TezosContractMetadata'
import { TezosFATokenMetadata } from '@airgap/coinlib-core/protocols/tezos/types/fa/TezosFATokenMetadata'
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
  tokenID: { status: UIResourceStatus.IDLE, value: undefined },

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

  constructor(private readonly protocolService: ProtocolService /*, private readonly filesystemService: FilesystemService */) {
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

  private updateWithValue = this.updater((state: TezosFAFormState, partialState: Partial<TezosFAFormState>) => {
    return {
      ...state,
      ...partialState,
      errorDescription: undefined
    }
  })

  private updateWithError = this.updater((state: TezosFAFormState, error: unknown) => {
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
      tokenID:
        tezosFAFormError.type === TezosFAFormErrorType.CONTRACT_NOT_FOUND
          ? { status: UIResourceStatus.IDLE, value: undefined }
          : state.tokenID,
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
      networks: networks
    }
  }

  private fetchTokenDetails(state: TezosFAFormState, inputDetails: TokenDetailsInput): Observable<Partial<TezosFAFormState>> {
    return new Observable((subscriber: Subscriber<Partial<TezosFAFormState>>) => {
      // tslint:disable-next-line: no-floating-promises
      new Promise<void>(async (resolve, reject) => {
        try {
          this.emitLoading(subscriber)

          const alreadySupported = await this.alreadySupported(inputDetails.address, inputDetails.networkIdentifier, inputDetails.tokenID)
          if (alreadySupported) {
            const handledAlreadySupported = await this.handleAlreadySupported(alreadySupported, inputDetails.tokenID)

            await this.tapProtocol(handledAlreadySupported)
            this.emitProtocol(handledAlreadySupported, inputDetails.tokenInterface, inputDetails.tokenID, subscriber)
            resolve()

            return
          }

          const network = state.networks.find((network: ProtocolNetwork) => network.identifier === inputDetails.networkIdentifier)
          let contract: TezosContract | undefined
          if (network && network instanceof TezosProtocolNetwork) {
            contract = await this.getContract(inputDetails.address, network)
          }
          this.emitContract(contract, subscriber)

          const tokenInterface: TokenInterface | undefined = await this.getTokenInterface(contract, inputDetails.tokenInterface)
          this.emitTokenInterface(tokenInterface, subscriber)

          let protocol: ICoinProtocol
          switch (tokenInterface) {
            case TokenInterface.FA1p2:
              protocol = await this.getFA1p2TokenDetails(contract)
              break
            case TokenInterface.FA2:
              protocol = await this.getFA2TokenDetails(contract, inputDetails.tokenID)
              break
            default:
              throw interfaceUnknownError()
          }

          this.emitProtocol(protocol, inputDetails.tokenInterface, inputDetails.tokenID, subscriber)
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

  private async alreadySupported(address: string, networkIdentifier: string, tokenID?: number): Promise<ICoinProtocol | undefined> {
    const subProtocols = await this.protocolService.getSubProtocols(MainProtocolSymbols.XTZ)
    const alreadySupportedProtocols = subProtocols.filter((protocol) => {
      return protocol.contractAddress === address && (protocol.options as TezosProtocolOptions).network.identifier === networkIdentifier
    })

    const alreadySupportedToken = alreadySupportedProtocols.find((protocol) => {
      return protocol instanceof TezosFA2Protocol && protocol.tokenID === tokenID
    })

    return alreadySupportedToken ?? alreadySupportedProtocols[0]
  }

  private async handleAlreadySupported(protocol: ICoinProtocol, tokenID?: number): Promise<ICoinProtocol> {
    if (protocol instanceof TezosFA2Protocol) {
      return this.handleFA2AlreadySupported(protocol, tokenID)
    } else {
      return protocol
    }
  }

  private async handleFA2AlreadySupported(protocol: TezosFA2Protocol, customTokenID?: number): Promise<TezosFA2Protocol> {
    if (customTokenID !== undefined && protocol.tokenID === customTokenID) {
      return protocol
    }

    try {
      return this.createFA2Protocol(protocol, customTokenID)
    } catch (error) {
      if (isTezosFAFormError(error) && error.type === TezosFAFormErrorType.TOKEN_METADATA_MISSING) {
        return protocol
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

  private async getFA1p2TokenDetails(contract: TezosContract): Promise<TezosFA1p2Protocol> {
    const genericFA1p2Protocol = new TezosFA1p2Protocol(
      new TezosFAProtocolOptions(contract.network, new TezosFAProtocolConfig(contract.address, faProtocolSymbol('1.2', contract.address)))
    )
    const tokenMetadata = await this.getFA1p2TokenMetadata(genericFA1p2Protocol)
    if (!tokenMetadata) {
      throw tokenMetadataMissingError()
    }

    const protocol: TezosFA1p2Protocol = new TezosFA1p2Protocol(
      new TezosFAProtocolOptions(
        genericFA1p2Protocol.options.network,
        new TezosFAProtocolConfig(
          genericFA1p2Protocol.options.config.contractAddress,
          faProtocolSymbol('1.2', contract.address),
          tokenMetadata.symbol,
          tokenMetadata.name,
          tokenMetadata.symbol,
          genericFA1p2Protocol.options.config.feeDefaults,
          tokenMetadata.decimals
        )
      )
    )

    await this.tapProtocol(protocol, tokenMetadata)

    return protocol
  }

  private async getFA2TokenDetails(contract: TezosContract, customTokenID: number | undefined): Promise<TezosFA2Protocol> {
    const genericFA2Protocol = new TezosFA2Protocol(
      new TezosFA2ProtocolOptions(
        contract.network,
        new TezosFA2ProtocolConfig(
          contract.address,
          faProtocolSymbol('2', contract.address, customTokenID),
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          customTokenID
        )
      )
    )

    return this.createFA2Protocol(genericFA2Protocol, customTokenID)
  }

  private async createFA2Protocol(baseProtocol: TezosFA2Protocol, customTokenID: number | undefined): Promise<TezosFA2Protocol> {
    const tokenMetadataRegistry = await this.getFA2TokenMetadata(baseProtocol)
    if (!tokenMetadataRegistry) {
      throw tokenMetadataMissingError()
    }

    const tokenMetadataRegistryEntries = Object.entries(tokenMetadataRegistry)
    const [tokenID, tokenMetadata] =
      customTokenID !== undefined
        ? [customTokenID, tokenMetadataRegistry[customTokenID]]
        : tokenMetadataRegistryEntries.length === 1
        ? [parseInt(tokenMetadataRegistryEntries[0][0]), tokenMetadataRegistryEntries[0][1]]
        : [undefined, undefined]

    if (tokenID === undefined) {
      throw tokenVaugeError(tokenMetadataRegistry)
    }
    if (tokenMetadata === undefined) {
      throw tokenMetadataMissingError()
    }

    const protocol: TezosFA2Protocol = new TezosFA2Protocol(
      new TezosFA2ProtocolOptions(
        baseProtocol.options.network,
        new TezosFA2ProtocolConfig(
          baseProtocol.options.config.contractAddress,
          faProtocolSymbol('2', baseProtocol.contractAddress, tokenID),
          tokenMetadata.symbol,
          tokenMetadata.name,
          tokenMetadata.symbol,
          baseProtocol.options.config.feeDefaults,
          tokenMetadata.decimals,
          tokenID
        )
      )
    )

    await this.tapProtocol(protocol, tokenMetadata)

    return protocol
  }

  private emitLoading(subscriber: Subscriber<Partial<TezosFAFormState>>): void {
    subscriber.next({
      tokenID: { status: UIResourceStatus.LOADING, value: undefined },
      tokenInterface: { status: UIResourceStatus.LOADING, value: undefined },
      protocol: { status: UIResourceStatus.LOADING, value: undefined }
    })
  }

  private emitProtocol(
    protocol: ICoinProtocol,
    tokenInterface: TokenInterface | undefined,
    tokenID: number | undefined,
    subscriber: Subscriber<Partial<TezosFAFormState>>
  ): void {
    subscriber.next({
      tokenID:
        tokenID !== undefined
          ? { status: UIResourceStatus.SUCCESS, value: tokenID }
          : protocol instanceof TezosFA2Protocol
          ? { status: UIResourceStatus.SUCCESS, value: protocol.tokenID }
          : { status: UIResourceStatus.SUCCESS, value: 0 },
      tokenInterface: {
        status: UIResourceStatus.SUCCESS,
        value:
          protocol instanceof TezosFA1p2Protocol
            ? TokenInterface.FA1p2
            : protocol instanceof TezosFA2Protocol
            ? TokenInterface.FA2
            : undefined
      },
      protocol: { status: UIResourceStatus.SUCCESS, value: protocol },
      ...(tokenInterface === undefined ? { tokenInterfaces: [] } : {}),
      ...(tokenID === undefined ? { tokens: [] } : {})
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
        return networks.find(
          (protocolNetwork: ProtocolNetwork) =>
            protocolNetwork instanceof TezosProtocolNetwork && protocolNetwork.extras.network === network
        ) as TezosProtocolNetwork
      })
    }

    return this.contractMetadata[contract.address]
  }

  private async getFA1p2TokenMetadata(protocol: TezosFA1p2Protocol): Promise<TezosFATokenMetadata | undefined> {
    const tokenMetadata = await this.getFATokenMetadata(protocol)
    return tokenMetadata[0]
  }

  private async getFA2TokenMetadata(protocol: TezosFA2Protocol): Promise<Record<number, TezosFATokenMetadata> | undefined> {
    if (!this.tokenMetadata[protocol.contractAddress]) {
      const allTokenMetadata = await protocol.getAllTokenMetadata()
      if (!allTokenMetadata) {
        return undefined
      }

      await Promise.all(
        Object.entries(allTokenMetadata).map(async ([tokenID, tokenMetadata]) => {
          this.tokenMetadata[protocol.contractAddress] = Object.assign(this.tokenMetadata[protocol.contractAddress] ?? {}, {
            [tokenID]: tokenMetadata
          })
        })
      )
    }

    return this.tokenMetadata[protocol.contractAddress]
  }

  private async getFATokenMetadata(
    protocol: TezosFA1p2Protocol | TezosFA2Protocol,
    tokenID?: number
  ): Promise<Record<number, TezosFATokenMetadata> | undefined> {
    tokenID = tokenID ?? ('tokenID' in protocol ? protocol.tokenID : 0)
    if (!this.tokenMetadata[protocol.contractAddress] || !this.tokenMetadata[protocol.contractAddress][tokenID]) {
      this.tokenMetadata[protocol.contractAddress] = Object.assign(this.tokenMetadata[protocol.contractAddress] ?? {}, {
        [tokenID]: await protocol.getTokenMetadata()
      })
    }

    return this.tokenMetadata[protocol.contractAddress]
  }

  private async tapProtocol(protocol: ICoinProtocol, tokenMetadata?: TezosFATokenMetadata): Promise<void> {
    if (tokenMetadata === undefined) {
      if (protocol instanceof TezosFA1p2Protocol) {
        tokenMetadata = await protocol.getTokenMetadata()
      } else if (protocol instanceof TezosFA2Protocol) {
        tokenMetadata = await protocol.getTokenMetadata()
      }
    }

    if (tokenMetadata) {
      await this.tapTokenMetadata(protocol, tokenMetadata)
    }
  }

  private async tapTokenMetadata(_protocol: ICoinProtocol, _tokenMetadata: TezosFATokenMetadata): Promise<void> {
    // const thumbnailUri = tokenMetadata.thumbnailUri
    // if (typeof thumbnailUri === 'string') {
    //   await this.filesystemService.writeLazyImage(`/images/symbols/${protocol.identifier}`, thumbnailUri.trim())
    // }
  }
}
