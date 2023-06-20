import { DeeplinkService, ProtocolService } from '@airgap/angular-core'
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { IonicSlides, Platform } from '@ionic/angular'
import { ICoinProtocol } from '@airgap/coinlib-core'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

const DEEPLINK_VAULT_ADD_ACCOUNT: string = `airgap-vault://add-account/`

@Component({
  selector: 'page-account-import-onboarding',
  templateUrl: 'account-import-onboarding.html',
  styleUrls: ['./account-import-onboarding.scss']
})
export class AccountImportOnboardingPage implements OnInit {
  public readonly swiperModules = [IonicSlides]

  public slide1: string = 'account-import-onboarding-slide_1.png'
  public slide2: string = 'account-import-onboarding-slide_2.png'
  public slide3: string = 'account-import-onboarding-slide_3.png'
  public slide4: string = 'account-import-onboarding-slide_4.png'

  @ViewChild('slides', { static: true })
  public slidesRef: ElementRef | undefined
  public slidePagination = {
    el: '.swiper-pagination',
    type: 'custom',
    renderCustom: (_swiper, current, total): string => {
      return this.customProgressBar(current, total)
    }
  }
  public protocol: ICoinProtocol | undefined
  public subProtocol: ICoinProtocol | undefined

  public isBegin: boolean = true
  public isEnd: boolean = false
  private indexEndingSlide: number

  public constructor(
    private readonly route: ActivatedRoute,
    public platform: Platform,
    private readonly deeplinkService: DeeplinkService,
    private readonly protocolService: ProtocolService
  ) {
    if (this.platform.is('ios')) {
      this.slide1 = 'account-import-onboarding-slide_1-ios.png'
      this.slide2 = 'account-import-onboarding-slide_2-ios.png'
      this.slide3 = 'account-import-onboarding-slide_3-ios.png'
      this.slide4 = 'account-import-onboarding-slide_4-ios.png'
    }
  }

  public async ngOnInit(): Promise<void> {
    const protocolID = this.route.snapshot.params.protocolID
    let mainProtocolIdentifier
    let subprotocolID

    if (protocolID.search('-') !== -1) {
      mainProtocolIdentifier = `${protocolID}`.split('-')[0]
      subprotocolID = protocolID
    }
    this.protocol = await this.protocolService.getProtocol(mainProtocolIdentifier ? mainProtocolIdentifier : protocolID)
    this.indexEndingSlide = 3
    if (subprotocolID !== undefined) {
      this.subProtocol = await this.protocolService.getProtocol(subprotocolID)
      this.indexEndingSlide = 4
    }
  }

  public async showPrevSlide(): Promise<void> {
    await this.slidesRef?.nativeElement.swiper.slidePrev()
  }

  public async showNextSlide(): Promise<void> {
    await this.slidesRef?.nativeElement.swiper.slideNext()
  }

  public onSlideChange(): void {
    const activeIndex = this.slidesRef?.nativeElement.swiper.activeIndex ?? -1
    this.isBegin = activeIndex === 0
    this.isEnd = activeIndex === this.indexEndingSlide
  }

  public openVault(): void {
    this.deeplinkService
      .sameDeviceDeeplink(`${DEEPLINK_VAULT_ADD_ACCOUNT}${this.protocol.identifier}`)
      .catch(handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER))
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
}
