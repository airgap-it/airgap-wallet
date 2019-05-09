import { Component, ViewChild, OnInit } from '@angular/core'
import { Platform, IonSlides } from '@ionic/angular'
import { ActivatedRoute } from '@angular/router'
import { getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'
import { DeepLinkProvider } from '../../services/deep-link/deep-link'
import { handleErrorSentry, ErrorCategory } from '../../services/sentry-error-handler/sentry-error-handler'

const DEEPLINK_VAULT_ADD_ACCOUNT = `airgap-vault://add-account/`

@Component({
  selector: 'page-account-import-onboarding',
  templateUrl: 'account-import-onboarding.html',
  styleUrls: ['./account-import-onboarding.scss']
})
export class AccountImportOnboardingPage implements OnInit {
  @ViewChild(IonSlides)
  slides: IonSlides
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    pagination: {
      el: '.swiper-pagination',
      type: 'custom',
      renderCustom: (swiper, current, total) => {
        return this.customProgressBar(current, total)
      }
    }
  }
  public protocol: ICoinProtocol
  isBegin: boolean = true
  isEnd: boolean = false

  constructor(private route: ActivatedRoute, public platform: Platform, private deeplinkProvider: DeepLinkProvider) {}

  ngOnInit() {
    if (this.route.snapshot.data['special']) {
      this.protocol = getProtocolByIdentifier(this.route.snapshot.data['special'])
      console.log(this.protocol)
    }
  }

  ionSlideDidChange() {
    this.slides.getActiveIndex().then(val => {
      if (val == 0) {
        this.isBegin = true
      } else {
        this.isBegin = false
      }
      if (val == 3) {
        this.isEnd = true
      } else {
        this.isEnd = false
      }
    })
  }

  openVault() {
    this.deeplinkProvider
      .sameDeviceDeeplink(`${DEEPLINK_VAULT_ADD_ACCOUNT}${this.protocol.identifier}`)
      .catch(handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER))
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
}
