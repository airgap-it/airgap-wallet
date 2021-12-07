import { Collectible } from '../../services/collectibles/collectibles.types'

import { CollectiblesListItem } from './collectibles-list.types'

export function collectiblesToListItems(collectibles: Collectible[]): CollectiblesListItem[] {
  return collectibles.map((collectible: Collectible) => ({
    id: getCollectiblesListItemId(collectible),
    thumbnail: collectible.thumbnails[0],
    fallbackThumbnails: collectible.thumbnails.slice(1),
    name: collectible.name,
    collectible
  }))
}

export function getCollectiblesListItemId(collectible: Collectible): string {
  return `${collectible.address.value}:${collectible.id}`
}
