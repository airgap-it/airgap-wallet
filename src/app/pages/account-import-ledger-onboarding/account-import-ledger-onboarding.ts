import { ProtocolService } from '@airgap/angular-core'
import { AirGapMarketWallet, ICoinProtocol } from '@airgap/coinlib-core'
import { ProtocolSymbols } from '@airgap/coinlib-core/utils/ProtocolSymbols'
import { Component, ElementRef, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { IonicSlides } from '@ionic/angular'

import { promiseRetry } from '../../helpers/promise'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { LedgerService } from '../../services/ledger/ledger-service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AccountSync } from '../../types/AccountSync'

@Component({
  selector: 'page-account-import-ledger-onboarding',
  templateUrl: 'account-import-ledger-onboarding.html',
  styleUrls: ['./account-import-ledger-onboarding.scss']
})
export class AccountImportLedgerOnboardingPage {
  public slideAssets: [string, string][] = []
  public readonly swiperModules = [IonicSlides]

  @ViewChild('slides', { static: true })
  public slidesRef: ElementRef | undefined
  public slidePagination = {
    el: '.swiper-pagination',
    type: 'custom',
    renderCustom: (_swiper, current, total): string => {
      return this.customProgressBar(current, total)
    }
  }

  public protocol: ICoinProtocol

  public canSlidePrev: boolean = false
  public canSlideNext: boolean = true
  public canFinish: boolean = false

  public isLoading: boolean = true
  public isSuccess?: boolean = undefined
  public isConnected: boolean = false

  private importPromise?: Promise<void>

  public constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly protocolService: ProtocolService,
    private readonly dataService: DataService,
    private readonly ledgerService: LedgerService
  ) {
    this.init()
  }

  public async showPrevSlide(): Promise<void> {
    await this.slidesRef?.nativeElement.swiper.slidePrev()
  }

  public async showNextSlide(): Promise<void> {
    await this.slidesRef?.nativeElement.swiper.slideNext()
  }

  public onSlideChange(): void {
    const activeIndex = this.slidesRef?.nativeElement.swiper.activeIndex ?? -1
    const isEnd = activeIndex === this.slideAssets.length - 1

    this.canSlidePrev = activeIndex > 0
    this.canSlideNext = !isEnd
    this.canFinish = isEnd

    this.importFromLedger()
  }

  public retry(): void {
    this.isLoading = true
    this.isSuccess = undefined
    this.importFromLedger()
  }

  public finish(): void {
    this.router.navigateByUrl('/tabs/portfolio', { replaceUrl: true }).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private customProgressBar(current: number, total: number): string {
    const ratio: number = current / total

    const progressBarStyle: string = `style='transform: translate3d(0px, 0px, 0px) scaleX(${ratio}) scaleY(1); transition-duration: 300ms;'`
    const progressBar: string = `<span class='swiper-pagination-progressbar-fill' ${progressBarStyle}></span>`

    let progressBarContainer: string =
      "<div class='swiper-pagination-progressbar' style='height: 4px; top: 6px; width: calc(100% - 32px);left: 16px;'>"
    progressBarContainer += progressBar
    progressBarContainer += '</span></div>'

    return progressBarContainer
  }

  private async init(): Promise<void> {
    const protocolID: ProtocolSymbols = this.route.snapshot.params.protocolID
    this.protocol = await this.protocolService.getProtocol(protocolID)

    this.slideAssets = [
      ['ledger_app_connected.svg', 'account-import-ledger-onboarding.slides.slide-1'],
      [`ledger_app_${this.protocol.identifier}.svg`, 'account-import-ledger-onboarding.slides.slide-2'],
      ['ledger_app_confirm.svg', 'account-import-ledger-onboarding.slides.slide-3']
    ]

    this.importFromLedger()
  }

  private async importFromLedger(): Promise<void> {
    if (this.isSuccess || !this.protocol) {
      return
    }

    if (!this.importPromise) {
      this.importPromise = promiseRetry(this.connectWithLedger(), { maxRetries: 4, interval: 300 })
        .then(() => {
          return promiseRetry(
            this.ledgerService.importWallet(this.protocol.identifier).then((wallet: AirGapMarketWallet) => {
              this.isLoading = false
              this.isSuccess = true

              const accountSyncs: AccountSync[] = [
                {
                  wallet
                }
              ]

              this.dataService.setData(DataServiceKey.SYNC_ACCOUNTS, accountSyncs)
              this.router
                .navigateByUrl(`/account-import/${DataServiceKey.SYNC_ACCOUNTS}`)
                .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
            }),
            { maxRetries: 1, interval: 300 }
          )
        })
        .catch((error: any) => {
          console.warn(error)
          if (this.canFinish) {
            this.isLoading = false
            this.isSuccess = false
          }
        })
        .finally(() => {
          this.importPromise = undefined
        })
    }

    return this.importPromise
  }

  private async connectWithLedger(): Promise<void> {
    if (this.isConnected || !this.protocol) {
      return
    }

    this.isLoading = true

    return this.ledgerService.openConnection(this.protocol.identifier).then(() => {
      this.isConnected = true
    })
  }
}
