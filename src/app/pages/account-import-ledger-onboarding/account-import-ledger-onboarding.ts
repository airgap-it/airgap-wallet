import { AfterViewInit, Component, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { IonSlides } from '@ionic/angular'
import { AirGapMarketWallet, getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'
import { promiseRetry } from 'src/app/helpers/promise'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-account-import-ledger-onboarding',
  templateUrl: 'account-import-ledger-onboarding.html',
  styleUrls: ['./account-import-ledger-onboarding.scss']
})
export class AccountImportLedgerOnboardingPage implements AfterViewInit {
  public slideAssets: [string, string][] = []

  @ViewChild(IonSlides, { static: true })
  public slides: IonSlides
  public slideOpts = {
    initialSlide: 0,
    speed: 400,
    pagination: {
      el: '.swiper-pagination',
      type: 'custom',
      renderCustom: (_swiper, current, total): string => {
        return this.customProgressBar(current, total)
      }
    }
  }

  public readonly protocol: ICoinProtocol

  public canSlidePrev: boolean = false
  public canSlideNext: boolean = true
  public canFinish: boolean = false

  public isLoading: boolean = true
  public isSuccess?: boolean = undefined
  public isConnected: boolean = false

  private importPromise?: Promise<void>

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly ledgerService: LedgerService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.protocol = getProtocolByIdentifier(info.protocolIdentifier)

      this.slideAssets = [
        ['ledger_app_connected.svg', 'account-import-ledger-onboarding.slides.slide-1'],
        [`ledger_app_${this.protocol.identifier}.svg`, 'account-import-ledger-onboarding.slides.slide-2'],
        ['ledger_app_confirm.svg', 'account-import-ledger-onboarding.slides.slide-3']
      ]
    }
  }

  public ngAfterViewInit(): void {
    this.importFromLedger()
  }

  public async showPrevSlide(): Promise<void> {
    await this.slides.slidePrev()
  }

  public async showNextSlide(): Promise<void> {
    await this.slides.slideNext()
    this.importFromLedger()
  }

  public ionSlideDidChange(): void {
    this.slides
      .getActiveIndex()
      .then((val: number) => {
        const isEnd = val === this.slideAssets.length - 1

        this.canSlidePrev = val > 0
        this.canSlideNext = !isEnd
        this.canFinish = isEnd
      })
      .catch(handleErrorSentry(ErrorCategory.OTHER))
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

    const progressBarStyle: string =
      "style='transform: translate3d(0px, 0px, 0px) scaleX(" + ratio + ") scaleY(1); transition-duration: 300ms;'"
    const progressBar: string = "<span class='swiper-pagination-progressbar-fill' " + progressBarStyle + '></span>'

    let progressBarContainer: string =
      "<div class='swiper-pagination-progressbar' style='height: 4px; top: 6px; width: calc(100% - 32px);left: 16px;'>"
    progressBarContainer += progressBar
    progressBarContainer += '</span></div>'

    return progressBarContainer
  }

  private async importFromLedger(): Promise<void> {
    if (this.isSuccess) {
      return
    }

    if (!this.importPromise) {
      this.importPromise = promiseRetry(this.connectWithLedger(), { maxRetries: 4, interval: 300 })
        .then(() => {
          return promiseRetry(
            this.ledgerService.importWallet(this.protocol.identifier).then((wallet: AirGapMarketWallet) => {
              this.isLoading = false
              this.isSuccess = true

              this.dataService.setData(DataServiceKey.WALLET, wallet)
              this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
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
    if (this.isConnected) {
      return
    }

    this.isLoading = true

    return promiseRetry(this.ledgerService.openConnection(this.protocol.identifier))
  }
}
