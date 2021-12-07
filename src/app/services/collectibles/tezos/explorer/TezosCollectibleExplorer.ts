import { Collectible, CollectibleDetails, CollectibleExplorer, isCollectible, isCollectibleDetails } from '../../collectibles.types'

export interface TezosCollectible extends Collectible, CollectibleDetails {
  contract: {
    address: string
    name?: string
  }
  description?: string
  metadataUri?: string
}

export interface TezosCollectibleDetails extends TezosCollectible {
  symbol?: string
  decimals: number
}

export function isTezosCollectible(value: unknown): value is TezosCollectible {
  if (!isCollectible(value)) {
    return false
  }

  const partialCollectible = value as Partial<TezosCollectible>

  return partialCollectible.contract !== undefined
}

export function isTezosCollectibleDetails(value: unknown): value is TezosCollectibleDetails {
  if (!isCollectibleDetails(value)) {
    return false
  }

  return isTezosCollectible(value)
}

export type TezosCollectibleExplorer = CollectibleExplorer<TezosCollectible, TezosCollectibleDetails>
