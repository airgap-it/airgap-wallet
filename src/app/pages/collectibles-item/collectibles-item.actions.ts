import { ProtocolSymbols } from '@airgap/coinlib-core'
import { ActivatedRouteSnapshot } from '@angular/router'
import { createAction, props } from '@ngrx/store'

import { CollectibleDetails } from '../../services/collectibles/collectibles.types'

import { CollectiblesItem } from './collectibles-item.types'

const featureName: string = 'Collectibles Item'

/**************** View Lifecycle ****************/

export const viewReload = createAction(`[${featureName}] View Reload`, props<{ routeSnapshot: ActivatedRouteSnapshot }>())
export const routeParamsRead = createAction(
  `[${featureName}] Route Params Read`,
  props<{
    publicKey: string | undefined
    addressIndex: number | undefined
    protocolIdentifier: ProtocolSymbols | undefined
    collectibleAddress: string | undefined
    collectibleId: string | undefined
  }>()
)

/**************** Details Loading ****************/

export const loadDetails = createAction(`[${featureName}] Load Details`, props<{ collectibleAddress: string; collectibleId: string }>())
export const detailsLoading = createAction(`[${featureName}] Details Loading`)
export const detailsLoadingSuccess = createAction(
  `[${featureName}] On Details Loading Success`,
  props<{ collectible: CollectibleDetails }>()
)
export const detailsLoadingFailure = createAction(`[${featureName}] Details Loading Failure`, props<{ error: any }>())

/**************** User Interaction ****************/

export const openUrl = createAction(`[${featureName}] Open URL`, props<{ url: string }>())
export const openUrlFailure = createAction(`[${featureName}] Open URL Failure`, props<{ error: any }>())

export const send = createAction(`[${featureName}] Send`, props<{ item: CollectiblesItem }>())
export const sendFailure = createAction(`[${featureName}] Send Failure`, props<{ error: any }>())

/**************** Error ****************/

export const invalidImg = createAction(`[${featureName}] Invalid img`)

/**************** Events ****************/

export const handled = createAction(`[${featureName}] Handled`)
export const toastDismissed = createAction(`[${featureName}] Toast Dismissed`, props<{ id: string }>())
