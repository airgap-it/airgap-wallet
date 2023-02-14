import { ProtocolService } from '@airgap/angular-core'
import { AirGapMarketWallet, ProtocolNetwork } from '@airgap/coinlib-core'
import { RemoteData } from '@airgap/coinlib-core/utils/remote-data/RemoteData'
import { TezosProtocol, TezosProtocolNetwork } from '@airgap/tezos'
import { TezosContractRemoteDataFactory } from '@airgap/tezos/v0/protocol/contract/remote-data/TezosContractRemoteDataFactory'
import { TezosContract } from '@airgap/tezos/v0/protocol/contract/TezosContract'
import { TezosFATokenMetadata } from '@airgap/tezos/v0/protocol/types/fa/TezosFATokenMetadata'
import { gql, request } from 'graphql-request'

import { faProtocolSymbol } from '../../../../types/GenericProtocolSymbols'
import { CollectibleCursor } from '../../collectibles.types'

import { TezosCollectible, TezosCollectibleDetails, TezosCollectibleExplorer } from './TezosCollectibleExplorer'

interface Token {
  token_id?: string | null
  metadata?: string | null
  name?: string | null
  description?: string | null
  fa?: FA
  artifact_uri?: string
}

interface TokenHolder {
  token?: Token
  quantity?: number | null
}

interface FA {
  contract?: string | null
  name?: string | null
}

interface TokenHolderResponse {
  token_holder?: TokenHolder[]
}

const OBJKT_API_URL = 'https://data.objkt.com/v3/graphql'
const OBJKT_PAGE_URL = 'https://objkt.com'
const OBJKT_ASSETS_URL = 'https://assets.objkt.media/file/assets-003'

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
    const { token_holder: tokenHolders } = await this.fetchTokenHoldersForAddress(address.address, limit + 1, page * limit)
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

    return this.tokenToTezosCollectible(protocol, { token: { token_id: tokenID, fa: { contract: contractAddress } }, ...tokenHolder })
  }

  private async fetchTokenHolderForTokenId(contractAddress: string, tokenID: string): Promise<TokenHolderResponse> {
    const query = gql`
      {
        token_holder(limit: 1, where: {
          token: {
            fa_contract: {
              _eq: "${contractAddress}"
            }
            token_id: {
              _eq: "${tokenID}"
            }
          },
          quantity: {
            _gt: 0
          }
        }) {
          token {
            token_id
            metadata
            token
            description
            fa {
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
          holder_address: {
            _eq: "${address}"
          },
          token: {
            token_id: {
              _nlike: ""
            },
            fa_contract: {
              _nlike: ""
            }
          },
          quantity: {
            _gt: 0
          }
        }) {
          token {
            token_id
            metadata
            artifact_uri
            name
            description
            fa {
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
    const id = tokenHolder.token?.token_id ?? undefined
    const amount = tokenHolder.quantity ?? undefined
    const metadataUri = tokenHolder.token?.metadata ?? undefined
    const contractAddress = tokenHolder.token?.fa?.contract ?? undefined
    const contractName = tokenHolder.token?.fa?.name ?? undefined
    const description = tokenHolder.token?.description ?? undefined
    const name = tokenHolder.token?.name ?? undefined

    if (!id || !contractAddress) {
      return undefined
    }

    return {
      protocolIdentifier: faProtocolSymbol('2', contractAddress),
      networkIdentifier: protocol.options.network.identifier,
      id,
      thumbnails: [
        await this.getAssetUrl(contractAddress, id, 'thumb400'),
        await this.getAssetUrl(contractAddress, id, 'thumb288'),
        await this.getAssetUrl(contractAddress, id, 'artifact', tokenHolder.token?.artifact_uri)
      ],
      contract: {
        address: contractAddress,
        name: contractName
      },
      description,
      name: name ?? description,
      imgs: [
        await this.getAssetUrl(contractAddress, id, 'artifact', tokenHolder.token?.artifact_uri),
        await this.getAssetUrl(contractAddress, id, 'thumb400'),
        await this.getAssetUrl(contractAddress, id, 'thumb288')
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

  private async getAssetUrl(
    contractAddress: string,
    tokenID: string,
    type: 'thumb288' | 'thumb400' | 'artifact',
    artifactUri?: string
  ): Promise<string> {
    if (artifactUri) {
      if (artifactUri.startsWith('ipfs')) {
        const sanitizedArtifactUri = artifactUri.replace('ipfs://', '')
        if (artifactUri.indexOf('?') !== -1) {
          const split = sanitizedArtifactUri.split('?')
          return `${this.assetsUrl}/${split[0]}/artifact/index.html?${split[1]}` // query params in artifact_uri
        }
        return `${this.assetsUrl}/${sanitizedArtifactUri}/artifact` // Single files (in directory) over IPFS
      }

      const digest = await this.digestMessage(artifactUri)
      return `${this.assetsUrl}/${digest}/artifact` // Single files over HTTP(s)
    }
    return `${this.assetsUrl}/${contractAddress}/${tokenID}/${type}` // Thumbs
  }

  // From OBJKT CDN V2 documentation at https://gist.github.com/vhf/e6f63e4b9f400caa115884a19a12b5d4#objktcom-assets-cdn-v2
  private async digestMessage(message) {
    const msgUint8 = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    return hashHex
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
