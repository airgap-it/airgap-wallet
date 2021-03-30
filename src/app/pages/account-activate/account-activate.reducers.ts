import { flattened, UIResource, UIResourceStatus } from '@airgap/angular-core'
import { AirGapMarketWallet, ProtocolSymbols } from '@airgap/coinlib-core'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store'

import * as fromRoot from '../../app.reducers'
import { AirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'

import * as actions from './account-activate.actions'
import { InactiveAccounts } from './account-activate.types'
import { createAccountId } from './account-activate.utils'

/**************** State ****************/

export interface FeatureState {
  // TODO: move wallet groups to a global state
  walletGroups: UIResource<AirGapMarketWalletGroup[]>
  protocolIdentifier: UIResource<ProtocolSymbols>
  checkedAccounts: string[]
}

export interface State extends fromRoot.State {
  accountActivate: FeatureState
}

/**************** Reducers ****************/

export const initialState: FeatureState = {
  walletGroups: {
    status: UIResourceStatus.IDLE,
    value: []
  },
  protocolIdentifier: {
    status: UIResourceStatus.IDLE,
    value: undefined
  },
  checkedAccounts: []
}

export const reducer = createReducer(
  initialState,
  on(actions.initialDataLoaded, (state, { walletGroups }) => ({
    ...state,
    walletGroups: {
      status: UIResourceStatus.SUCCESS,
      value: walletGroups
    },
    checkedAccounts: []
  })),
  on(actions.navigationDataLoaded, (state, { protocolIdentifier }) => ({
    ...state,
    protocolIdentifier: {
      status: UIResourceStatus.SUCCESS,
      value: protocolIdentifier
    },
    checkedAccounts: []
  })),
  on(actions.invalidNavigationData, state => ({
    ...state,
    protocolIdentifier: {
      status: UIResourceStatus.ERROR,
      value: undefined
    }
  })),
  on(actions.accountToggled, (state, { protocolIdentifier, publicKey }) => {
    const accountId: string = createAccountId(protocolIdentifier, publicKey)
    const foundIndex: number = state.checkedAccounts.indexOf(accountId)

    return {
      ...state,
      checkedAccounts:
        foundIndex > -1
          ? state.checkedAccounts.slice(0, foundIndex).concat(state.checkedAccounts.slice(foundIndex + 1))
          : [...state.checkedAccounts, accountId]
    }
  })
)

/**************** Selectors ****************/

export const selectFeatureState = createFeatureSelector<State, FeatureState>('accountActivate')

export const selectWalletGroups = createSelector(
  selectFeatureState,
  (state: FeatureState): UIResource<AirGapMarketWalletGroup[]> => state.walletGroups
)
export const selectProtocolIdentifier = createSelector(
  selectFeatureState,
  (state: FeatureState): UIResource<ProtocolSymbols> => state.protocolIdentifier
)
export const selectCheckedAccounts = createSelector(
  selectFeatureState,
  (state: FeatureState): string[] => state.checkedAccounts
)

export const selectInactiveAccounts = createSelector(
  selectWalletGroups,
  selectProtocolIdentifier,
  (
    walletGroups: UIResource<AirGapMarketWalletGroup[]>,
    protocolIdentifier: UIResource<ProtocolSymbols>
  ): UIResource<InactiveAccounts[]> => {
    if (protocolIdentifier.status === UIResourceStatus.SUCCESS || protocolIdentifier.value !== undefined) {
      return {
        status: walletGroups.status,
        value:
          walletGroups.value !== undefined
            ? walletGroups.value
                .map((walletGroup: AirGapMarketWalletGroup) => ({
                  id: walletGroup.id,
                  label: walletGroup.label,
                  wallets: walletGroup.wallets.filter(
                    (wallet: AirGapMarketWallet) =>
                      wallet.protocol.identifier === protocolIdentifier.value && wallet.status !== AirGapWalletStatus.ACTIVE
                  )
                }))
                .filter((group: InactiveAccounts) => group.wallets.length > 0)
            : undefined
      }
    } else {
      return {
        status: protocolIdentifier.status,
        value: []
      }
    }
  }
)

export const selectIsAccountChecked = createSelector(
  selectInactiveAccounts,
  selectCheckedAccounts,
  (inactiveAccounts: UIResource<InactiveAccounts[]>, checkedAccounts: string[]): Record<string, boolean> => {
    if (inactiveAccounts.value === undefined || inactiveAccounts.value.length === 0) {
      return {}
    }

    const checkedAccountsSet: Set<string> = new Set(checkedAccounts)
    const inactiveWallets: AirGapMarketWallet[] = flattened(inactiveAccounts.value.map((group: InactiveAccounts) => group.wallets))

    return inactiveWallets.reduce((record: Record<string, boolean>, next: AirGapMarketWallet) => {
      const accountId: string = createAccountId(next)

      return Object.assign(record, { [accountId]: checkedAccountsSet.has(accountId) })
    }, {})
  }
)
