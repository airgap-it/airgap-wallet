import { ProtocolService } from '@airgap/angular-core'
import { AirGapMarketWallet, ProtocolNetwork, TezosProtocol, TezosProtocolNetwork } from '@airgap/coinlib-core'
import { TezosContractRemoteDataFactory } from '@airgap/coinlib-core/protocols/tezos/contract/remote-data/TezosContractRemoteDataFactory'
import { TezosContract } from '@airgap/coinlib-core/protocols/tezos/contract/TezosContract'
import { TezosFATokenMetadata } from '@airgap/coinlib-core/protocols/tezos/types/fa/TezosFATokenMetadata'
import { RemoteData } from '@airgap/coinlib-core/utils/remote-data/RemoteData'
import { gql, request } from 'graphql-request'

import { faProtocolSymbol } from '../../../../types/GenericProtocolSymbols'
import { CollectibleCursor } from '../../collectibles.types'

import { TezosCollectible, TezosCollectibleDetails, TezosCollectibleExplorer } from './TezosCollectibleExplorer'

interface Token {
  id?: string
  metadata?: string
  description?: string
  title?: string
  fa2?: FA2
}

interface TokenHolder {
  token?: Token
  quantity?: number
}

interface FA2 {
  contract?: string
  name?: string
}

interface TokenHolderResponse {
  token_holder?: TokenHolder[]
}

const OBJKT_API_URL = 'https://data.objkt.com/v1/graphql'
const OBJKT_PAGE_URL = 'https://objkt.com'
const OBJKT_ASSETS_URL = 'https://assets.objkt.com/file/assets-001'

export class ObjktCollectibleExplorer implements TezosCollectibleExplorer {
  private readonly remoteDataFactory: TezosContractRemoteDataFactory = new TezosContractRemoteDataFactory()
  private readonly collectibles: Map<string, TezosCollectible> = new Map()
  private readonly tokenMetadata: Map<string, TezosFATokenMetadata> = new Map()

  public constructor(
    private readonly protocolService: ProtocolService,
    private readonly apiUrl: string = OBJKT_API_URL,
    private readonly pageUrl: string = OBJKT_PAGE_URL,
    private readonly assetsUrl: string = OBJKT_ASSETS_URL
  ) {}

  public async getCollectibles(wallet: AirGapMarketWallet, page: number, limit: number): Promise<CollectibleCursor<TezosCollectible>> {
    if (!(wallet.protocol instanceof TezosProtocol)) {
      return {
        collectibles: [],
        page,
        hasNext: false
      }
    }
    const tezosProtocol = wallet.protocol

    const address = await tezosProtocol.getAddressFromPublicKey(wallet.publicKey)
    const { token_holder: tokenHolders } = await this.fetchTokenHoldersForAddress(address.getValue(), limit + 1, page * limit)
    const collectiblesOrUndefined: (TezosCollectible | undefined)[] | undefined = await Promise.all(
      tokenHolders?.slice(0, limit)?.map(async (tokenHolder) => this.tokenToTezosCollectible(tezosProtocol, tokenHolder))
    )

    const collectibles: TezosCollectible[] = collectiblesOrUndefined?.filter((collectible) => collectible !== undefined) ?? []
    this.cacheCollectibles(collectibles)

    const hasNext = tokenHolders.length === limit + 1

    return {
      collectibles,
      page,
      hasNext
    }
  }

  public async getCollectibleDetails(
    wallet: AirGapMarketWallet,
    address: string,
    id: string
  ): Promise<TezosCollectibleDetails | undefined> {
    if (!(wallet.protocol instanceof TezosProtocol)) {
      return undefined
    }
    const tezosProtocol = wallet.protocol

    const collectible = await this.getCollectible(tezosProtocol, address, id)
    const tokenMetadata = collectible.metadataUri
      ? await this.getTokenMetadata(tezosProtocol, collectible.contract.address, collectible.metadataUri)
      : undefined

    return {
      ...collectible,
      symbol: 'NFT',
      decimals: tokenMetadata?.decimals ?? 0
    }
  }

  private async getCollectible(protocol: TezosProtocol, contractAddress: string, tokenID: string): Promise<TezosCollectible | undefined> {
    const key = this.getCollectibleKey(contractAddress, tokenID)
    const cached = this.collectibles.get(key)
    if (cached) {
      return cached
    }

    const { token_holder: tokenHolders } = await this.fetchTokenHolderForTokenId(contractAddress, tokenID)
    const tokenHolder = tokenHolders ? tokenHolders[0] : undefined
    if (!tokenHolder) {
      return undefined
    }

    return this.tokenToTezosCollectible(protocol, { token: { id: tokenID, fa2: { contract: contractAddress } }, ...tokenHolder })
  }

  private async fetchTokenHolderForTokenId(contractAddress: string, tokenID: string): Promise<TokenHolderResponse> {
    const query = gql`
      {
        token_holder(limit: 1, where: {
          token: {
            fa2_id: {
              _eq: "${contractAddress}"
            }
            id: {
              _eq: "${tokenID}"
            }
          },
          quantity: {
            _gt: 0
          }
        }) {
          token {
            id
            metadata
            description
            title
            fa2 {
              contract
              name
            }
          }
          quantity
        }
      }
    `

    return request(this.apiUrl, query)
  }

  private async fetchTokenHoldersForAddress(address: string, limit: number, offset: number): Promise<TokenHolderResponse> {
    const query = gql`
      {
        token_holder(limit: ${limit}, offset: ${offset}, where: {
          holder_id: {
            _eq: "${address}"
          },
          token: {
            id: {
              _nlike: ""
            },
            fa2_id: {
              _nlike: ""
            }
          },
          quantity: {
            _gt: 0
          }
        }) {
          token {
            id
            metadata
            description
            title
            fa2 {
              contract
              name
            }
          }
          quantity
        }
      }
    `

    return request(this.apiUrl, query)
  }

  private async tokenToTezosCollectible(protocol: TezosProtocol, tokenHolder: TokenHolder): Promise<TezosCollectible | undefined> {
    const id = tokenHolder.token?.id
    const amount = tokenHolder.quantity
    const metadataUri = tokenHolder.token?.metadata
    const contractAddress = tokenHolder.token?.fa2?.contract
    const contractName = tokenHolder.token?.fa2?.name
    const description = tokenHolder.token?.description
    const title = tokenHolder.token?.title

    if (!id || !contractAddress) {
      return undefined
    }

    return {
      protocolIdentifier: faProtocolSymbol('2', contractAddress),
      networkIdentifier: protocol.options.network.identifier,
      id,
      thumbnails: [
        this.getAssetUrl(contractAddress, id, 'thumb400'),
        this.getAssetUrl(contractAddress, id, 'thumb288'),
        this.getAssetUrl(contractAddress, id, 'display')
      ],
      contract: {
        address: contractAddress,
        name: contractName
      },
      description,
      name: title,
      imgs: [
        this.getAssetUrl(contractAddress, id, 'display'),
        this.getAssetUrl(contractAddress, id, 'thumb400'),
        this.getAssetUrl(contractAddress, id, 'thumb288')
      ],
      amount: amount.toString(),
      address: { type: 'contract', value: contractAddress },
      moreDetails: {
        label: 'objkt-collectible-explorer.more-details.view-on',
        url: this.getDetailsUrl(contractAddress, id)
      },
      metadataUri
    }
  }

  private async getTokenMetadata(protocol: TezosProtocol, contractAddress: string, uri: string): Promise<TezosFATokenMetadata | undefined> {
    if (!this.tokenMetadata.has(uri)) {
      const contract = new TezosContract(contractAddress, protocol.options.network)

      const networks = await this.protocolService.getNetworksForProtocol(protocol)
      const remoteData: RemoteData<TezosFATokenMetadata> = this.remoteDataFactory.create(uri, {
        contract,
        networkResolver: (network: string) => {
          return networks.find(
            (protocolNetwork: ProtocolNetwork) =>
              protocolNetwork instanceof TezosProtocolNetwork && protocolNetwork.extras.network === network
          ) as TezosProtocolNetwork
        }
      })
      if (!remoteData) {
        return undefined
      }

      const tokenMetadata = await remoteData.get()
      if (!tokenMetadata) {
        return undefined
      }

      this.tokenMetadata.set(uri, tokenMetadata)
    }

    return this.tokenMetadata.get(uri)
  }

  private getAssetUrl(contractAddress: string, tokenID: string, type: 'thumb288' | 'thumb400' | 'display'): string {
    const path = tokenID.slice(-2).padStart(2, '0').split('').join('/')

    return `${this.assetsUrl}/${contractAddress}/${path}/${tokenID}/${type}`
  }

  private getDetailsUrl(contractAddress: string, tokenID: string): string {
    return `${this.pageUrl}/asset/${contractAddress}/${tokenID}`
  }

  private cacheCollectibles(collectibles: TezosCollectible[]): void {
    collectibles.forEach((collectible) => {
      this.cacheCollectible(collectible)
    })
  }

  private cacheCollectible(collectible: TezosCollectible): void {
    const key = this.getCollectibleKey(collectible.address.value, collectible.id)
    if (!this.collectibles.has(key)) {
      this.collectibles.set(key, collectible)
    }
  }

  private getCollectibleKey(contractAddress: string, tokenID: string): string {
    return `${contractAddress}:${tokenID}`
  }
}
