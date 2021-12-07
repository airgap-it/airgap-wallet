import { CollectibleDetails } from '../../services/collectibles/collectibles.types'

import { CollectiblesItem } from './collectibles-item.types'

export function collectibleDetailsToItem(collectibleDetails: CollectibleDetails): CollectiblesItem {
  return {
    id: getCollectiblesItemId(collectibleDetails),
    img: collectibleDetails.imgs[0],
    fallbackImgs: collectibleDetails.imgs.slice(1),
    name: collectibleDetails.name,
    description: collectibleDetails.description,
    amount: collectibleDetails.amount,
    address: {
      type: collectibleDetails.address.type,
      value: collectibleDetails.address.value
    },
    moreDetails: {
      label: collectibleDetails.moreDetails.label,
      url: collectibleDetails.moreDetails.url
    },
    collectibleDetails
  }
}

export function getCollectiblesItemId(collectibleDetails: CollectibleDetails): string {
  return `${collectibleDetails.address.value}:${collectibleDetails.id}`
}
