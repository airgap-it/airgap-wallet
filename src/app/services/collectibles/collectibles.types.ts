import { AirGapMarketWallet, ProtocolSymbols } from '@airgap/coinlib-core'

export interface Collectible {
  protocolIdentifier: ProtocolSymbols
  networkIdentifier: string
  id: string
  address: {
    type: AddressType
    value: string
  }
  name: string
  thumbnails: string[]
}

export function isCollectible(value: unknown): value is Collectible {
  if (typeof value !== 'object') {
    return false
  }

  const partialCollectible = value as Partial<Collectible>

  return (
    partialCollectible.protocolIdentifier !== undefined &&
    partialCollectible.networkIdentifier !== undefined &&
    partialCollectible.id !== undefined &&
    partialCollectible.name !== undefined &&
    partialCollectible.thumbnails !== undefined
  )
}

type AddressType = 'contract'
export interface CollectibleDetails extends Collectible {
  amount?: string
  imgs: string[]
  description?: string
  moreDetails?: {
    label: string
    url: string
  }
}

export function isCollectibleDetails(value: unknown): value is CollectibleDetails {
  if (!isCollectible(value)) {
    return false
  }

  const partialDetails = value as Partial<CollectibleDetails>

  return partialDetails.imgs !== undefined
}

export interface CollectibleCursor<C extends Collectible = Collectible> {
  collectibles: C[]
  page: number
  hasNext: boolean
}

export interface CollectibleExplorer<C extends Collectible = Collectible, D extends CollectibleDetails = CollectibleDetails> {
  getCollectibles(wallet: AirGapMarketWallet, page: number, limit: number): Promise<CollectibleCursor<C>>
  getCollectibleDetails(wallet: AirGapMarketWallet, address: string, id: string): Promise<D | undefined>
}
