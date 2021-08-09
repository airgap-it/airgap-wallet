import { ProtocolService, UIResourceStatus } from '@airgap/angular-core'
import { AirGapMarketWallet, ICoinProtocol, ProtocolSymbols } from '@airgap/coinlib-core'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { Action, Store } from '@ngrx/store'
import { concat, from, of } from 'rxjs'
import { first, switchMap, tap, withLatestFrom } from 'rxjs/operators'

import { AirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'
import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

import * as actions from './account-activate.actions'
import * as fromAccountActivate from './account-activate.reducers'
import { ProtocolDetails } from './account-activate.types'
import { createAccountId } from './account-activate.utils'

@Injectable()
export class AccountActivateEffects {
  public initialData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.viewWillEnter),
      withLatestFrom(this.accountProvider.getWalletGroupsObservable()),
      switchMap(([action, walletGroups]) =>
        concat(of(actions.initialDataLoaded({ walletGroups })), from(this.loadNavigationData(action.routeParams)).pipe(first()))
      )
    )
  )

  public add$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(actions.addButtonClicked),
        withLatestFrom(this.store.select(fromAccountActivate.selectWalletGroups)),
        withLatestFrom(this.store.select(fromAccountActivate.selectCheckedAccounts)),
        tap(async ([[_, walletsGroups], checkedAccounts]) => {
          if (walletsGroups.status !== UIResourceStatus.SUCCESS || walletsGroups.value === undefined) {
            return
          }

          await this.addAccounts(walletsGroups.value, checkedAccounts)
          this.popToRoot()
        })
      ),
    { dispatch: false }
  )

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<fromAccountActivate.State>,
    private readonly router: Router,
    private readonly accountProvider: AccountProvider,
    private readonly protocolService: ProtocolService
  ) {}

  private async loadNavigationData(routeParams: any): Promise<Action> {
    const protocolIdentifier: ProtocolSymbols | undefined = routeParams.protocolID
    const protocol: ICoinProtocol | undefined =
      protocolIdentifier !== undefined ? await this.protocolService.getProtocol(protocolIdentifier) : undefined
    const protocolDetails: ProtocolDetails | undefined =
      protocol !== undefined ? { name: protocol.name, identifier: protocol.identifier } : undefined

    return protocolDetails !== undefined ? actions.navigationDataLoaded({ protocolDetails }) : actions.invalidNavigationData()
  }

  private async addAccounts(walletGroups: AirGapMarketWalletGroup[], checkedAccounts: string[]): Promise<void> {
    const checkedAccountsSet: Set<string> = new Set(checkedAccounts)

    await Promise.all(walletGroups.map((walletGroup: AirGapMarketWalletGroup) => this.activateWallets(walletGroup, checkedAccountsSet)))
  }

  private async activateWallets(walletGroup: AirGapMarketWalletGroup, checkedAccounts: Set<string>): Promise<void> {
    await Promise.all(
      walletGroup.wallets
        .filter((wallet: AirGapMarketWallet) => checkedAccounts.has(createAccountId(wallet)))
        .map((wallet: AirGapMarketWallet) => this.activateWallet(wallet, walletGroup.id))
    )
  }

  private async activateWallet(wallet: AirGapMarketWallet, groupId: string): Promise<void> {
    await this.accountProvider.activateWallet(wallet, groupId)
  }

  private popToRoot(): void {
    this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
