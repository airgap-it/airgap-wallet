import { BaseComponent, UIResource, UIResourceStatus } from '@airgap/angular-core'
import { Component, Inject, ViewChild } from '@angular/core'
import { IonInfiniteScroll, Platform } from '@ionic/angular'
import { debounceTime, takeUntil } from 'rxjs/operators'

import * as sentryErrorHandler from '../../services/sentry-error-handler/sentry-error-handler'

import { CollectiblesListFacade, CollectiblesListNgRxFacade, COLLECTIBLES_LIST_FACADE } from './collectibles-list.facade'
import { CollectiblesListItem } from './collectibles-list.types'

@Component({
  selector: 'page-collectibles-list',
  templateUrl: './collectibles-list.page.html',
  styleUrls: ['./collectibles-list.page.scss'],
  providers: [{ provide: COLLECTIBLES_LIST_FACADE, useClass: CollectiblesListNgRxFacade }]
})
export class CollectiblesListPage extends BaseComponent<CollectiblesListFacade> {
  public readonly UIResourceStatus: typeof UIResourceStatus = UIResourceStatus

  @ViewChild(IonInfiniteScroll)
  public infiniteScroll?: IonInfiniteScroll

  public readonly isDesktop: boolean

  private infiniteScollActive: boolean = false

  constructor(@Inject(COLLECTIBLES_LIST_FACADE) facade: CollectiblesListFacade, private readonly platform: Platform) {
    super(facade)

    this.isDesktop = this.platform.is('desktop')

    this.facade.loadedAll$.pipe(takeUntil(this.ngDestroyed$)).subscribe(this.toggleInfiniteScroll.bind(this))
    this.facade.items$.pipe(debounceTime(300), takeUntil(this.ngDestroyed$)).subscribe(this.setInfiniteScollStatus.bind(this))
  }

  public loadMore(): void {
    this.infiniteScollActive = true
    this.facade.loadMore()
  }

  public onItemClick(item: CollectiblesListItem): void {
    this.facade.onCollectibleSelected(item)
  }

  public onInvalidThumbnail(item: CollectiblesListItem): void {
    this.facade.onInvalidThumbnail(item)
  }

  private toggleInfiniteScroll(disabled: boolean): void {
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = disabled
      this.infiniteScollActive = disabled ? false : this.infiniteScollActive
    }
  }

  private async setInfiniteScollStatus(items: UIResource<CollectiblesListItem[]>): Promise<void> {
    if (this.infiniteScroll && this.infiniteScollActive && items.status !== UIResourceStatus.LOADING) {
      await this.infiniteScroll.complete().catch(sentryErrorHandler.handleErrorSentry(sentryErrorHandler.ErrorCategory.IONIC_LOADER))
      this.infiniteScollActive = false
    }
  }
}
