import { Collectible } from '../../services/collectibles/collectibles.types'

/**************** Toast ****************/

export interface ErrorToast {
  type: 'loading' | 'showDetails' | 'unknown'
  error?: any
}

export type Toast = ErrorToast

/**************** CollectiblesListItem ****************/

export interface CollectiblesListItem {
  id: string
  thumbnail?: string
  fallbackThumbnails?: string[]
  name: string
  collectible: Collectible
}
