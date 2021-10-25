import { flattened, UIResource, UIResourceStatus } from '@airgap/angular-core'
import { AirGapMarketWallet, ProtocolSymbols } from '@airgap/coinlib-core'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store'

import * as fromRoot from '../../app.reducers'
import { AirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'

import * as actions from './account-activate.actions'
import { ProtocolDetails } from './account-activate.types'
import { createAccountId } from './account-activate.utils'

/**************** State ****************/

export interface FeatureState {
  // TODO: move wallet groups to a global state
  walletGroups: UIResource<AirGapMarketWalletGroup[]>
  protocol: UIResource<ProtocolDetails>
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
  protocol: {
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
  on(actions.navigationDataLoaded, (state, { protocolDetails }) => ({
    ...state,
    protocol: {
      status: UIResourceStatus.SUCCESS,
      value: protocolDetails
    },
    checkedAccounts: []
  })),
  on(actions.invalidNavigationData, (state) => ({
    ...state,
    protocol: {
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
export const selectProtocolDetails = createSelector(
  selectFeatureState,
  (state: FeatureState): UIResource<ProtocolDetails> => state.protocol
)
export const selectCheckedAccounts = createSelector(selectFeatureState, (state: FeatureState): string[] => state.checkedAccounts)

export const selectProtocolIdentifier = createSelector(
  selectFeatureState,
  (state: FeatureState): UIResource<ProtocolSymbols> => ({
    status: state.protocol.status,
    value: state.protocol.value !== undefined ? state.protocol.value.identifier : undefined
  })
)

export const selectProtocolName = createSelector(
  selectFeatureState,
  (state: FeatureState): UIResource<string> => ({
    status: state.protocol.status,
    value: state.protocol.value !== undefined ? state.protocol.value.name : undefined
  })
)

export const selectInactiveAccounts = createSelector(
  selectWalletGroups,
  selectProtocolIdentifier,
  (
    walletGroups: UIResource<AirGapMarketWalletGroup[]>,
    protocolIdentifier: UIResource<ProtocolSymbols>
  ): UIResource<AirGapMarketWalletGroup[]> => {
    if (protocolIdentifier.status === UIResourceStatus.SUCCESS || protocolIdentifier.value !== undefined) {
      return {
        status: walletGroups.status,
        value:
          walletGroups.value !== undefined
            ? walletGroups.value
                .map(
                  (walletGroup: AirGapMarketWalletGroup) =>
                    new AirGapMarketWalletGroup(
                      walletGroup.id,
                      walletGroup.label,
                      walletGroup.interactionSetting,
                      walletGroup.wallets.filter(
                        (wallet: AirGapMarketWallet) =>
                          wallet.protocol.identifier === protocolIdentifier.value && wallet.status !== AirGapWalletStatus.ACTIVE
                      ),
                      walletGroup.transient
                    )
                )
                .filter((group: AirGapMarketWalletGroup) => group.wallets.length > 0)
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
  (inactiveAccounts: UIResource<AirGapMarketWalletGroup[]>, checkedAccounts: string[]): Record<string, boolean> => {
    if (inactiveAccounts.value === undefined || inactiveAccounts.value.length === 0) {
      return {}
    }

    const checkedAccountsSet: Set<string> = new Set(checkedAccounts)
    const inactiveWallets: AirGapMarketWallet[] = flattened(inactiveAccounts.value.map((group: AirGapMarketWalletGroup) => group.wallets))

    return inactiveWallets.reduce((record: Record<string, boolean>, next: AirGapMarketWallet) => {
      const accountId: string = createAccountId(next)

      return Object.assign(record, { [accountId]: checkedAccountsSet.has(accountId) })
    }, {})
  }
)
