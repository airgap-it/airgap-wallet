import { Component, OnInit, ViewChild } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { IonSlides, Platform } from '@ionic/angular'
import { getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'

import { DeepLinkProvider } from '../../services/deep-link/deep-link'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

const DEEPLINK_VAULT_ADD_ACCOUNT = `airgap-vault://add-account/`

@Component({
  selector: 'page-account-import-onboarding',
  templateUrl: 'account-import-onboarding.html',
  styleUrls: ['./account-import-onboarding.scss']
})
export class AccountImportOnboardingPage implements OnInit {
  @ViewChild(IonSlides)
  public slides: IonSlides
  public slideOpts = {
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
  public isBegin: boolean = true
  public isEnd: boolean = false

  constructor(private readonly route: ActivatedRoute, public platform: Platform, private readonly deeplinkProvider: DeepLinkProvider) {}

  public ngOnInit() {
    if (this.route.snapshot.data.special) {
      this.protocol = getProtocolByIdentifier(this.route.snapshot.data.special)
      console.log(this.protocol)
    }
  }

  public ionSlideDidChange() {
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

  public openVault() {
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
