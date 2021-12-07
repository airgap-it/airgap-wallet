import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Router } from '@angular/router'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { Action, Store } from '@ngrx/store'
import { concat, from, MonoTypeOperatorFunction, of } from 'rxjs'
import { concatMap, first, switchMap, tap, withLatestFrom } from 'rxjs/operators'

import { AccountProvider } from '../../services/account/account.provider'
import { CollectiblesService } from '../../services/collectibles/collectibles.service'
import { DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

import * as actions from './collectibles-list.actions'
import * as fromCollectiblesList from './collectibles-list.reducers'
import { CollectiblesListItem } from './collectibles-list.types'

@Injectable()
export class CollectiblesListEffects {
  public viewReload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.viewReload),
      concatMap((action) => concat(of(this.readRouteParams(action.routeSnapshot)), of(actions.loadCollectibles({ limit: action.limit }))))
    )
  )

  public loadCollectibles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadCollectibles),
      withLatestFrom(this.store.select(fromCollectiblesList.selectPage)),
      withLatestFrom(this.store.select(fromCollectiblesList.selectWallet(this.accountProvider, this.wallet)).pipe(this.cacheWallet())),
      switchMap(([[action, page], wallet]) =>
        concat(of(actions.collectiblesLoading()), from(this.loadCollectibles(wallet, page, action.limit)).pipe(first()))
      )
    )
  )

  public collectibleSelected$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.collectibleSelected),
      withLatestFrom(this.store.select(fromCollectiblesList.selectWallet(this.accountProvider, this.wallet)).pipe(this.cacheWallet())),
      switchMap(([action, wallet]) => from(this.showDetails(wallet, action.item)).pipe(first()))
    )
  )

  public handled$ = createEffect(() => this.actions$.pipe(ofType(actions.handled)), { dispatch: false })

  private wallet: AirGapMarketWallet | undefined

  public constructor(
    private readonly actions$: Actions,
    private readonly store: Store<fromCollectiblesList.State>,
    private readonly router: Router,
    private readonly accountProvider: AccountProvider,
    private readonly collectiblesService: CollectiblesService
  ) {}

  private readRouteParams(routeSnapshot: ActivatedRouteSnapshot): Action {
    const publicKey = routeSnapshot.params.publicKey
    const protocolIdentifier = routeSnapshot.params.protocolID
    let addressIndex = parseInt(routeSnapshot.params.addressIndex, 10)
    if (isNaN(addressIndex)) {
      addressIndex = undefined
    }

    return actions.routeParamsRead({ publicKey, addressIndex, protocolIdentifier })
  }

  private async loadCollectibles(wallet: AirGapMarketWallet | undefined, page: number, limit: number): Promise<Action> {
    try {
      if (wallet === undefined) {
        throw new Error('Could not find a wallet')
      }

      const cursor = await this.collectiblesService.getCollectibles(wallet, page, limit)

      return actions.collectiblesLoadingSuccess({ collectibles: cursor.collectibles, hasNext: cursor.hasNext })
    } catch (error) {
      // tslint:disable-next-line: no-console
      console.error(error)

      return actions.collectiblesLoadingFailure({ error })
    }
  }

  private async showDetails(wallet: AirGapMarketWallet | undefined, item: CollectiblesListItem): Promise<Action> {
    try {
      if (wallet === undefined) {
        throw new Error('Could not find a wallet')
      }

      await this.router
        .navigateByUrl(
          `/collectibles-item/${DataServiceKey.DETAIL}/${wallet.publicKey}/${wallet.protocol.identifier}/${wallet.addressIndex}/${item.id}`
        )
        .catch((error) => {
          handleErrorSentry(ErrorCategory.NAVIGATION)(error)

          throw error
        })

      return actions.handled()
    } catch (error) {
      // tslint:disable-next-line: no-console
      console.error(error)

      return actions.showDetailsFailed({ error })
    }
  }

  private cacheWallet(): MonoTypeOperatorFunction<AirGapMarketWallet> {
    return tap((wallet: AirGapMarketWallet | undefined) => {
      this.wallet = wallet
    })
  }
}
