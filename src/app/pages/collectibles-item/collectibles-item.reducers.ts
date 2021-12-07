import { generateGUID, UIAction, UIActionStatus, UIResource, UIResourceStatus } from '@airgap/angular-core'
import { AirGapMarketWallet, ProtocolSymbols } from '@airgap/coinlib-core'
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store'

import * as fromRoot from '../../app.reducers'
import { AccountProvider } from '../../services/account/account.provider'

import * as actions from './collectibles-item.actions'
import { CollectiblesItem, Toast } from './collectibles-item.types'
import { collectibleDetailsToItem } from './collectibles-item.utils'

/**************** State ****************/

export interface FeatureState {
  publicKey: string | undefined
  addressIndex: number | undefined
  protocolIdentifier: ProtocolSymbols | undefined

  collectible: UIResource<CollectiblesItem>

  toast: UIAction<Toast> | undefined
}

export interface State extends fromRoot.State {
  collectiblesItem: FeatureState
}

/**************** Reducers ****************/

export const initialState: FeatureState = {
  publicKey: undefined,
  addressIndex: undefined,
  protocolIdentifier: undefined,

  collectible: {
    status: UIResourceStatus.IDLE,
    value: undefined
  },

  toast:  undefined
}

export const reducer = createReducer(
  initialState,
  on(actions.viewReload, (_state) => initialState),
  on(actions.routeParamsRead, (state, { publicKey, addressIndex, protocolIdentifier }) => ({
    ...state,
    publicKey,
    addressIndex,
    protocolIdentifier
  })),
  on(actions.detailsLoading, (state) => ({
    ...state,
    collectible: {
      status: UIResourceStatus.LOADING,
      value: state.collectible.value
    }
  })),
  on(actions.detailsLoadingSuccess, (state, { collectible }) => ({
    ...state,
    collectible: {
      status: UIResourceStatus.SUCCESS,
      value: collectibleDetailsToItem(collectible)
    }
  })),
  on(actions.detailsLoadingFailure, (state, { error }) => ({
    ...state,
    collectible: {
      status: UIResourceStatus.ERROR,
      value: state.collectible.value
    },
    toast: {
      id: generateGUID(),
      value: {
        type: 'loading',
        error
      },
      status: UIActionStatus.PENDING
    }
  })),
  on(actions.openUrlFailure, (state, { error }) => ({
    ...state,
    toast: {
      id: generateGUID(),
      value: {
        type: 'openUrl',
        error
      },
      status: UIActionStatus.PENDING
    }
  })),
  on(actions.sendFailure, (state, { error }) => ({
    ...state,
    toast: {
      id: generateGUID(),
      value: {
        type: 'send',
        error
      },
      status: UIActionStatus.PENDING
    }
  })),
  on(actions.invalidImg, (state) => {
    const item = state.collectible.value
    if (!item) {
      return state
    }

    const imgIndex = item.fallbackImgs.indexOf(item.img)

    return {
      ...state,
      collectible: {
        status: state.collectible.status,
        value: {
          ...state.collectible.value,
          img: item.fallbackImgs[imgIndex + 1]
        }
      }
    }
  }),
  on(actions.toastDismissed, (state, { id }) => ({
    ...state,
    toast: state.toast
      ? {
          id: state.toast.id,
          value: state.toast.value,
          status: id === state.toast.id ? UIActionStatus.HANDLED : state.toast.status
        }
      : undefined
  }))
)

/**************** Selectors ****************/

export const selectFeatureState = createFeatureSelector<State, FeatureState>('collectiblesItem')

export const selectPublicKey = createSelector(selectFeatureState, (state: FeatureState): string | undefined => state.publicKey)
export const selectAddressIndex = createSelector(selectFeatureState, (state: FeatureState): number | undefined => state.addressIndex)
export const selectProtocolIdentifier = createSelector(
  selectFeatureState,
  (state: FeatureState): ProtocolSymbols | undefined => state.protocolIdentifier
)

export const selectWallet = (accountProvider: AccountProvider, cachedWallet: AirGapMarketWallet | undefined) =>
  createSelector(
    selectPublicKey,
    selectAddressIndex,
    selectProtocolIdentifier,
    (
      publicKey: string | undefined,
      addressIndex: number | undefined,
      protocolIdentifier: ProtocolSymbols | undefined
    ): AirGapMarketWallet | undefined => {
      if (publicKey === undefined || protocolIdentifier === undefined) {
        return undefined
      }

      if (
        cachedWallet !== undefined &&
        cachedWallet.publicKey === publicKey &&
        cachedWallet.addressIndex === addressIndex &&
        cachedWallet.protocol.identifier === protocolIdentifier
      ) {
        return cachedWallet
      }

      return accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(publicKey, protocolIdentifier, addressIndex)
    }
  )

export const selectItem = createSelector(selectFeatureState, (state: FeatureState): UIResource<CollectiblesItem> => state.collectible)
export const selectToast = createSelector(selectFeatureState, (state: FeatureState): UIAction<Toast> => state.toast)
