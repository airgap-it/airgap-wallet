import { Component, ViewChild } from '@angular/core'
import { ICoinProtocol, getProtocolByIdentifier } from 'airgap-coin-lib'
import { ActivatedRoute, Router } from '@angular/router'
import { IonSlides, AlertController } from '@ionic/angular'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { TranslateService } from '@ngx-translate/core'
import { DataServiceKey, DataService } from 'src/app/services/data/data.service'

@Component({
  selector: 'page-account-import-ledger-onboarding',
  templateUrl: 'account-import-ledger-onboarding.html',
  styleUrls: ['./account-import-ledger-onboarding.scss']
})
export class AccountImportLedgerOnboardingPage {
  public slideAssets: [string, string][] = [
    ['account-import-onboarding-slide_1-ledger.svg', 'account-import-ledger-onboarding.slides.slide-1'],
    ['account-import-onboarding-slide_2-ledger.svg', 'account-import-ledger-onboarding.slides.slide-2'],
    ['account-import-onboarding-slide_3-ledger.svg', 'account-import-ledger-onboarding.slides.slide-3']
  ]

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
  public canRetry: boolean = false
  public canFinish: boolean = false

  public isLoading: boolean = false

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly alertCtrl: AlertController,
    private readonly translateService: TranslateService,
    private readonly ledgerService: LedgerService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.protocol = getProtocolByIdentifier(info.protocolIdentifier)
    }
  }

  public ionSlideDidChange(): void {
    this.slides
      .getActiveIndex()
      .then((val: number) => {
        const isEnd = val === this.slideAssets.length - 1

        this.canSlidePrev = val > 0
        this.canSlideNext = !isEnd
        this.canFinish = isEnd

        if (isEnd) {
          this.importFromLedger()
        }
      })
      .catch(handleErrorSentry(ErrorCategory.OTHER))
  }

  public async importFromLedger(): Promise<void> {
    try {
      this.isLoading = true

      const wallet = await this.ledgerService.importWallet(this.protocol.identifier)
      this.dataService.setData(DataServiceKey.WALLET, wallet)
      this.router.navigateByUrl(`/account-import/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      this.canRetry = false
    } catch (error) {
      this.canRetry = true
      console.warn(error)
      this.promptError()
    } finally {
      this.isLoading = false
    }
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

  private async promptError() {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('account-import-ledger-onboarding.error-alert.header'),
      message: this.translateService.instant('account-import-ledger-onboarding.error-alert.message', { protocolName: this.protocol.name }),
      buttons: [
        {
          text: this.translateService.instant('account-import-ledger-onboarding.error-alert.confirm')
        }
      ]
    })
    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }
}
