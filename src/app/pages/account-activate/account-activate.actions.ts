import { ProtocolSymbols } from '@airgap/coinlib-core'
import { createAction, props } from '@ngrx/store'

import { AirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'

import { ProtocolDetails } from './account-activate.types'

const featureName: string = 'Account Activate'

/**************** View Lifecycle ****************/

export const viewWillEnter = createAction(`[${featureName}] View Will Enter`, props<{ routeParams: any }>())
export const initialDataLoaded = createAction(`[${featureName}] Initial Data Loaded`, props<{ walletGroups: AirGapMarketWalletGroup[] }>())

export const navigationDataLoaded = createAction(`[${featureName}] Navigation Data Loaded`, props<{ protocolDetails: ProtocolDetails }>())
export const invalidNavigationData = createAction(`[${featureName}] Invalid Navigation Data`)

/**************** User Interaction ****************/

export const accountToggled = createAction(
  `[${featureName}] Account Toggled`,
  props<{ protocolIdentifier: ProtocolSymbols; publicKey: string }>()
)
export const addButtonClicked = createAction(`[${featureName}] Add Button Clicked`)
