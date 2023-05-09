import { Component, NgZone, ViewChild } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController, Platform, PopoverController, IonInfiniteScroll } from '@ionic/angular'
import { OverlayEventDetail } from '@ionic/core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { DelegateEditPopoverComponent } from 'src/app/components/delegate-edit-popover/delegate-edit-popover.component'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { isType } from 'src/app/utils/utils'

@Component({
  selector: 'delegation-list',
  templateUrl: './delegation-list.page.html',
  styleUrls: ['./delegation-list.page.scss']
})
export class DelegationListPage {
  private static DEFAULT_ITEM_LOADING_STEP = 10
  private static DESKTOP_ITEM_LOADING_STEP = 30

  public wallet: AirGapMarketWallet

  public delegateeLabel: string
  public delegateeLabelPlural: string

  public areMultipleDelegationsSupported: boolean

  public searchTerm: string = ''

  public readonly isDesktop: boolean

  public currentDelegatees: UIAccountSummary[] = []
  public knownDelegatees: UIAccountSummary[] = []
  public filteredDelegatees: UIAccountSummary[] = []
  public displayedDelegatees: UIAccountSummary[] = []

  @ViewChild(IonInfiniteScroll)
  public infiniteScroll?: IonInfiniteScroll

  private callback: (address: string) => void

  private get itemLoadingStep(): number {
    return this.isDesktop ? DelegationListPage.DESKTOP_ITEM_LOADING_STEP : DelegationListPage.DEFAULT_ITEM_LOADING_STEP
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly navController: NavController,
    private readonly operations: OperationsProvider,
    private readonly popoverController: PopoverController,
    private readonly ngZone: NgZone,
    private readonly platform: Platform
  ) {
    this.isDesktop = this.platform.is('desktop')
  }

  ngOnInit() {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.delegateeLabel = info.delegateeLabel
      this.delegateeLabelPlural = info.delegateeLabelPlural
      this.areMultipleDelegationsSupported = info.areMultipleDelegationsSupported
      this.callback = info.callback

      // tslint:disable-next-line: no-floating-promises
      this.operations.getDelegateesSummary(this.wallet, info.currentDelegatees).then((summary: UIAccountSummary[]) => {
        this.currentDelegatees = summary.filter(
          (summary) => summary.address !== undefined && info.currentDelegatees.includes(summary.address)
        )
        this.knownDelegatees = summary.filter((summary) => !info.currentDelegatees.includes(summary.address))

        this.filteredDelegatees = this.knownDelegatees

        this.ngZone.run(() => {
          this.loadMoreItems(this.itemLoadingStep)
        })
      })
    }
  }

  public async presentPopover(event: any): Promise<void> {
    const popover: HTMLIonPopoverElement = await this.popoverController.create({
      component: DelegateEditPopoverComponent,
      componentProps: {
        delegateeLabel: this.delegateeLabel,
        delegateeLabelPlural: this.delegateeLabelPlural,
        protocolIdentifier: this.wallet.protocol.identifier,
        networkIdentifier: this.wallet.protocol.options.network.identifier
      },
      event,
      translucent: true
    })

    popover
      .onDidDismiss()
      .then(async ({ data }: OverlayEventDetail<unknown>) => {
        if (isType<{ delegateeAddress: string }>(data, 'delegateeAddress')) {
          this.navigateToDetails(data.delegateeAddress)
        } else {
          console.log('Unknown option selected.')
        }
      })
      .catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))

    return popover.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public setFilteredItems(searchTerm: string): void {
    if (searchTerm.length === 0) {
      this.filteredDelegatees = this.knownDelegatees
    } else {
      this.filteredDelegatees = this.knownDelegatees.filter((delegatee: UIAccountSummary) => {
        const searchTermLowerCase: string = searchTerm.toLowerCase()
        const hasMatchingAddress: boolean = delegatee.address.toLowerCase().includes(searchTermLowerCase)
        const hasMatchingName: boolean = delegatee.header[0].toLowerCase().includes(searchTermLowerCase)

        return hasMatchingAddress || hasMatchingName
      })
    }

    this.displayedDelegatees = this.getFilteredDlegatees()
  }

  public async loadMoreItems(step: number = this.itemLoadingStep): Promise<void> {
    if (this.searchTerm.length === 0) {
      this.displayedDelegatees = [
        ...this.displayedDelegatees,
        ...this.getFilteredDlegatees(Math.max(this.displayedDelegatees.length - 1, 0), step)
      ].filter((value: UIAccountSummary, index: number, array: UIAccountSummary[]) => array.indexOf(value) === index)
    }

    if (this.infiniteScroll) {
      await this.infiniteScroll.complete()
      if (this.displayedDelegatees.length === this.knownDelegatees.length) {
        this.infiniteScroll.disabled = true
      }
    }
  }

  public navigateToDetails(address: string): void {
    this.callback(address)
    this.navController.pop()
  }

  private getFilteredDlegatees(startIndex: number = 0, step: number = this.itemLoadingStep): UIAccountSummary[] {
    return this.filteredDelegatees.slice(0, startIndex + step)
  }
}
