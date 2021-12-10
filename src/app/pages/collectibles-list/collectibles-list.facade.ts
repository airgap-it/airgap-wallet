import { assertNever, BaseFacade, UIAction, UiEventService, UIResource } from '@airgap/angular-core'
import { BaseNgRxFacade, FacadeTypes } from '@airgap/angular-ngrx'
import { Injectable, InjectionToken } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { ToastOptions } from '@ionic/core'
import { Store } from '@ngrx/store'
import { Observable } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

import * as actions from './collectibles-list.actions'
import * as fromCollectiblesList from './collectibles-list.reducers'
import { CollectiblesListItem, Toast } from './collectibles-list.types'

export const COLLECTIBLES_LIST_FACADE = new InjectionToken<CollectiblesListFacade>('CollectiblesListFacade')
export type CollectiblesListFacade<T extends BaseFacade = BaseFacade> = ICollectiblesListFacade & T
export interface ICollectiblesListFacade {
  readonly items$: Observable<UIResource<CollectiblesListItem[]>>
  readonly loadedAll$: Observable<boolean>

  loadMore(): void
  onCollectibleSelected(item: CollectiblesListItem): void
  onInvalidThumbnail(item: CollectiblesListItem): void
}

const COLLECTIBLES_LIMIT = 10

interface Types extends FacadeTypes {
  Toast: Toast
}

@Injectable()
export class CollectiblesListNgRxFacade extends BaseNgRxFacade<Store<fromCollectiblesList.State>, Types>
  implements ICollectiblesListFacade {
  public readonly items$: Observable<UIResource<CollectiblesListItem[]>>
  public readonly loadedAll$: Observable<boolean>

  private readonly toast$: Observable<UIAction<Toast>>

  public constructor(store: Store<fromCollectiblesList.State>, private readonly route: ActivatedRoute, uiEventService: UiEventService) {
    super(store, uiEventService)

    this.items$ = this.store.select(fromCollectiblesList.selectCollectibles)
    this.loadedAll$ = this.store.select(fromCollectiblesList.selectLoadedAll)
    this.toast$ = this.store.select(fromCollectiblesList.selectToast)

    this.toast$.pipe(takeUntil(this.viewDestroyed$)).subscribe(this.showOrHideToast.bind(this))
  }

  public onViewCreate(): never {
    this.store.dispatch(actions.viewReload({ routeSnapshot: this.route.snapshot, limit: COLLECTIBLES_LIMIT }))

    return super.onViewCreate()
  }

  public loadMore(): void {
    this.store.dispatch(actions.loadCollectibles({ limit: COLLECTIBLES_LIMIT }))
  }

  public onCollectibleSelected(item: CollectiblesListItem): void {
    this.store.dispatch(actions.collectibleSelected({ item }))
  }

  public onInvalidThumbnail(item: CollectiblesListItem): void {
    this.store.dispatch(actions.invalidThumbnail({ item }))
  }

  protected onToastDismissed(toast: UIAction<Toast>): void {
    this.store.dispatch(actions.toastDismissed({ id: toast.id }))
  }

  protected getToastData(toast: Toast): ToastOptions {
    switch (toast.type) {
      case 'loading':
        return this.loadingErrorToast(toast.error)
      case 'showDetails':
        return this.showDetailsErrorToast(toast.error)
      case 'unknown':
        return this.unknownErrorToast(toast.error)
      default:
        assertNever('getToastData', toast.type)
    }
  }

  private loadingErrorToast(_error?: any): ToastOptions {
    return {
      message: 'collectibles-list.error.loading.message'
    }
  }

  private showDetailsErrorToast(_error?: any): ToastOptions {
    return {
      message: 'collectibles-list.error.show-details.message'
    }
  }

  private unknownErrorToast(_error?: any): ToastOptions {
    return {
      message: 'collectibles-list.error.unknown.message'
    }
  }
}
