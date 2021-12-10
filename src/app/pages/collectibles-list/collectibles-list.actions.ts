import { ProtocolSymbols } from '@airgap/coinlib-core'
import { ActivatedRouteSnapshot } from '@angular/router'
import { createAction, props } from '@ngrx/store'

import { Collectible } from '../../services/collectibles/collectibles.types'

import { CollectiblesListItem } from './collectibles-list.types'

const featureName: string = 'Collectibles List'

/**************** View Lifecycle ****************/

export const viewReload = createAction(`[${featureName}] View Reload`, props<{ routeSnapshot: ActivatedRouteSnapshot; limit: number }>())
export const routeParamsRead = createAction(
  `[${featureName}] Route Params Read`,
  props<{ publicKey: string | undefined; addressIndex: number | undefined; protocolIdentifier: ProtocolSymbols | undefined }>()
)

/**************** User Interaction ****************/

export const loadCollectibles = createAction(`[${featureName}] Load Collectibles`, props<{ limit: number }>())
export const collectiblesLoading = createAction(`[${featureName}] Collectibles Loading`)
export const collectiblesLoadingSuccess = createAction(
  `[${featureName}] Collectibles Loading Success`,
  props<{ collectibles: Collectible[]; hasNext: boolean }>()
)
export const collectiblesLoadingFailure = createAction(`[${featureName}] Collectibles Loading Error`, props<{ error?: any }>())

export const collectibleSelected = createAction(`[${featureName}] Collectible Selected`, props<{ item: CollectiblesListItem }>())

/**************** Error ****************/

export const invalidThumbnail = createAction(`[${featureName}] Invalid Thumbnail`, props<{ item: CollectiblesListItem }>())

export const showDetailsFailed = createAction(`[${featureName}] Show Details Failed`, props<{ error: any }>())

/**************** Events ****************/

export const handled = createAction(`[${featureName}] Handled`)
export const toastDismissed = createAction(`[${featureName}] Toast Dismissed`, props<{ id: string }>())
