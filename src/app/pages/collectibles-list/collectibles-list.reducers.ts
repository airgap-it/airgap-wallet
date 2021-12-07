import { generateGUID, UIAction, UIActionStatus, UIResource, UIResourceStatus } from '@airgap/angular-core'
import { AirGapMarketWallet, ProtocolSymbols } from '@airgap/coinlib-core'
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store'

import * as fromRoot from '../../app.reducers'
import { AccountProvider } from '../../services/account/account.provider'

import * as actions from './collectibles-list.actions'
import { CollectiblesListItem, Toast } from './collectibles-list.types'
import { collectiblesToListItems } from './collectibles-list.utils'

/**************** State ****************/

export interface FeatureState {
  publicKey: string | undefined
  addressIndex: number | undefined
  protocolIdentifier: ProtocolSymbols | undefined

  collectibles: UIResource<CollectiblesListItem[]>
  page: number
  loadedAll: boolean

  toast: UIAction<Toast> | undefined
}

export interface State extends fromRoot.State {
  collectiblesList: FeatureState
}

/**************** Reducers ****************/

export const initialState: FeatureState = {
  publicKey: undefined,
  addressIndex: undefined,
  protocolIdentifier: undefined,

  collectibles: {
    status: UIResourceStatus.IDLE,
    value: []
  },
  page: 0,
  loadedAll: false,

  toast: undefined
}

export const reducer = createReducer(
  initialState,
  on(actions.viewReload, (_state) => initialState),
  on(actions.routeParamsRead, (state, { publicKey, addressIndex, protocolIdentifier }) => ({
    ...state,
    publicKey,
    addressIndex,
    protocolIdentifier,
    toast: undefined
  })),
  on(actions.collectiblesLoading, (state) => ({
    ...state,
    collectibles: {
      status: UIResourceStatus.LOADING,
      value: state.collectibles.value
    },
    toast: undefined
  })),
  on(actions.collectiblesLoadingSuccess, (state, { collectibles, hasNext }) => ({
    ...state,
    collectibles: {
      status: UIResourceStatus.SUCCESS,
      value: state.collectibles.value.concat(collectiblesToListItems(collectibles))
    },
    page: state.page + 1,
    loadedAll: !hasNext || collectibles.length === 0,
    toast: undefined
  })),
  on(actions.collectiblesLoadingFailure, (state, { error }) => ({
    ...state,
    collectibles: {
      status: UIResourceStatus.ERROR,
      value: state.collectibles.value
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
  on(actions.showDetailsFailed, (state, { error }) => ({
    ...state,
    toast: {
      id: generateGUID(),
      value: {
        type: 'showDetails',
        error
      },
      status: UIActionStatus.PENDING
    }
  })),
  on(actions.invalidThumbnail, (state, { item }) => {
    const index = state.collectibles.value.indexOf(item)
    const thumbnailIndex = item.fallbackThumbnails.indexOf(item.thumbnail)

    return {
      ...state,
      collectibles: {
        status: state.collectibles.status,
        value:
          index > -1 && item.thumbnail
            ? [
                ...state.collectibles.value.slice(0, index),
                {
                  ...item,
                  thumbnail: item.fallbackThumbnails[thumbnailIndex + 1]
                },
                ...state.collectibles.value.slice(index + 1)
              ]
            : state.collectibles.value
      },
      toast: undefined
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

export const selectFeatureState = createFeatureSelector<State, FeatureState>('collectiblesList')

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

export const selectCollectibles = createSelector(
  selectFeatureState,
  (state: FeatureState): UIResource<CollectiblesListItem[]> => state.collectibles
)
export const selectPage = createSelector(selectFeatureState, (state: FeatureState): number => state.page)
export const selectLoadedAll = createSelector(selectFeatureState, (state: FeatureState): boolean => state.loadedAll)
export const selectToast = createSelector(selectFeatureState, (state: FeatureState): UIAction<Toast> => state.toast)
