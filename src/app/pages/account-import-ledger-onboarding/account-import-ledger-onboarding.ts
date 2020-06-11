import { Component, ViewChild } from '@angular/core'
import { ICoinProtocol, getProtocolByIdentifier, AirGapMarketWallet } from 'airgap-coin-lib'
import { ActivatedRoute, Router } from '@angular/router'
import { IonSlides } from '@ionic/angular'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { DataServiceKey, DataService } from 'src/app/services/data/data.service'

@Component({
  selector: 'page-account-import-ledger-onboarding',
  templateUrl: 'account-import-ledger-onboarding.html',
  styleUrls: ['./account-import-ledger-onboarding.scss']
})
export class AccountImportLedgerOnboardingPage {
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

  private currentSlide: number = this.slideOpts.initialSlide

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

  public async showPrevSlide(): Promise<void> {
    await this.slides.slidePrev()
  }

  public async showNextSlide(): Promise<void> {
    if (this.currentSlide === 0 && this.isSuccess === undefined) {
      await this.connectWithLedger()
    }
    await this.slides.slideNext()
  }

  public ionSlideDidChange(): void {
    this.slides
      .getActiveIndex()
      .then((val: number) => {
        this.currentSlide = val

        const isEnd = val === this.slideAssets.length - 1

        this.canSlidePrev = val > 0
        this.canSlideNext = !isEnd
        this.canFinish = isEnd

        if (isEnd && this.isSuccess === undefined) {
          this.importFromLedger()
        }
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

  private async connectWithLedger(): Promise<void> {
    this.isLoading = true

    await this.ledgerService.openConnection(this.protocol.identifier)
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
    if (!this.importPromise) {
      this.importPromise = this.ledgerService
        .importWallet(this.protocol.identifier)
        .then((wallet: AirGapMarketWallet) => {
          this.isSuccess = true

          this.dataService.setData(DataServiceKey.WALLET, wallet)
          this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        })
        .catch((error: any) => {
          console.warn(error)
          this.isSuccess = false
        })
        .finally(() => {
          this.importPromise = undefined
          this.isLoading = false
        })
    }

    return this.importPromise
  }
}
