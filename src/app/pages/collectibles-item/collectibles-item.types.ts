import { CollectibleDetails } from '../../services/collectibles/collectibles.types'

/**************** Toast ****************/

export interface ErrorToast {
  type: 'loading' | 'openUrl' | 'send' | 'unknown'
  error?: any
}

export type Toast = ErrorToast

/**************** CollectiblesItem ****************/

export type CollectiblesItemAddressType = 'contract'
export interface CollectiblesItemAddress {
  type: CollectiblesItemAddressType
  value: string
}

export interface CollectiblesItemMoreDetails {
  label: string
  url: string
}

export interface CollectiblesItem {
  id: string
  img?: string
  fallbackImgs?: string[]
  name: string
  description?: string
  amount?: string
  address: CollectiblesItemAddress
  moreDetails?: CollectiblesItemMoreDetails
  collectibleDetails: CollectibleDetails
}
