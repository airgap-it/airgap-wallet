import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController, ModalController, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'

import { ClipboardService } from '../../services/clipboard/clipboard'
import { SchemeRoutingProvider } from '../../services/scheme-routing/scheme-routing'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SerializerService } from '../../services/serializer/serializer.service'
import { IntroductionPage } from '../introduction/introduction'

declare var window: any
declare var cordova: any

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {
  constructor(
    public readonly platform: Platform,
    public readonly alertCtrl: AlertController,
    public readonly serializerService: SerializerService,
    private readonly router: Router,
    private readonly modalController: ModalController,
    private readonly translateService: TranslateService,
    private readonly clipboardProvider: ClipboardService,
    private readonly schemeRoutingProvider: SchemeRoutingProvider
  ) {}

  public about(): void {
    this.router.navigateByUrl('/about').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public share(): void {
    const options = {
      message: 'Take a look at the app I found. Its the most secure practical way to do crypto transactions.',
      // not supported on some apps (Facebook, Instagram)
      subject: 'Checkout airgap.it', // fi. for email
      url: 'https://www.airgap.it',
      chooserTitle: 'Pick an app' // Android only, you can override the default share sheet title
    }

    const onSuccess: (result: any) => void = (result: any): void => {
      console.log(`Share completed: ${result.completed}`) // On Android apps mostly return false even while it's true
      console.log(`Shared to app: ${result.app}`)
      // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    }

    const onError: (msg: string) => void = (msg: string): void => {
      console.log('Sharing failed with message: ' + msg)
    }

    window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError)
  }

  public async introduction(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: IntroductionPage
    })

    modal
      .dismiss(async () => {
        //
      })
      .catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
    modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }

  public feedback(): void {
    this.openUrl('https://github.com/airgap-it/airgap-wallet/issues')
  }

  public async telegram(): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('settings.alert_title'),
      inputs: [
        {
          type: 'radio',
          label: this.translateService.instant('settings.channel.international'),
          value: 'International',
          checked: true
        },
        {
          type: 'radio',
          label: this.translateService.instant('settings.channel.chinese'),
          value: 'Chinese'
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('settings.alert_cancel'),
          role: 'cancel',
          cssClass: 'secondary',
          handler: (): void => {
            console.log('Confirm Cancel')
          }
        },
        {
          text: this.translateService.instant('settings.telegram_label'),
          handler: (data: string): void => {
            switch (data) {
              case 'Chinese':
                this.openUrl('https://t.me/AirGap_cn')
                break
              case 'International':
              default:
                this.openUrl('https://t.me/AirGap')
            }
          }
        }
      ]
    })

    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  public translate(): void {
    this.openUrl('https://translate.sook.ch/')
  }

  /*
  // Removed because of google policies
  public donate(): void {
    this.openUrl('https://airgap.it/#donate')
  }
  */

  public githubDistro(): void {
    this.openUrl('https://github.com/airgap-it/airgap-distro')
  }

  public githubWebSigner(): void {
    this.openUrl('https://github.com/airgap-it/airgap-web-signer')
  }

  public githubWallet(): void {
    this.openUrl('https://github.com/airgap-it')
  }

  public faq(): void {
    this.openUrl('https://airgap.it/#faq')
  }

  private openUrl(url: string): void {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  public pasteClipboard(): void {
    this.clipboardProvider.paste().then(
      (text: string) => {
        this.schemeRoutingProvider.handleNewSyncRequest(this.router, text).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
      },
      (err: string) => {
        console.error('Error: ' + err)
      }
    )
  }

  public switchSerializerVersion(event: TouchEvent): void {
    console.log((event.detail as any).checked)
    this.serializerService.useV2 = (event.detail as any).checked
  }
  public qrMsChanged(event: TouchEvent): void {
    console.log((event.detail as any).value)
    this.serializerService.displayTimePerChunk = (event.detail as any).value
  }
  public qrBytesChanged(event: TouchEvent): void {
    console.log((event.detail as any).value)
    this.serializerService.chunkSize = (event.detail as any).value
  }
}
