import { ClipboardService, SerializerService } from '@airgap/angular-core'
import { Component, Inject } from '@angular/core'
import { Router } from '@angular/router'
import { SharePlugin } from '@capacitor/core'
import { AlertController, ModalController, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { SHARE_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'
import { BrowserService } from 'src/app/services/browser/browser.service'

import { SchemeRoutingProvider } from '../../services/scheme-routing/scheme-routing'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { IntroductionPage } from '../introduction/introduction'

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
    private readonly schemeRoutingProvider: SchemeRoutingProvider,
    private readonly browserService: BrowserService,
    @Inject(SHARE_PLUGIN) private readonly sharePlugin: SharePlugin
  ) {}

  public about(): void {
    this.router.navigateByUrl('/about').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public beaconPermissions(): void {
    this.router.navigateByUrl('/beacon-permission-list').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public beaconSettings(): void {
    this.router.navigateByUrl('/settings-beacon').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public share(): void {
    const options = {
      title: 'Checkout airgap.it', // Set a title for any message. This will be the subject if sharing to email
      text: 'Take a look at the app I found. Its the most secure practical way to do crypto transactions.', // Set some text to share
      url: 'https://www.airgap.it', // Set a URL to share
      dialogTitle: 'Pick an app' // Set a title for the share modal. Android only
    }

    this.sharePlugin
      .share(options)
      .then(result => {
        console.log(`Share completed: ${result}`)
      })
      .catch(error => {
        console.log('Sharing failed with error: ' + error)
      })
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
    this.browserService.openUrl('https://github.com/airgap-it/airgap-wallet/issues')
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
                this.browserService.openUrl('https://t.me/AirGap_cn')
                break
              case 'International':
              default:
                this.browserService.openUrl('https://t.me/AirGap')
            }
          }
        }
      ]
    })

    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  public translate(): void {
    this.browserService.openUrl('https://translate.sook.ch/')
  }

  /*
  // Removed because of google policies
  public donate(): void {
    this.openUrl('https://airgap.it/#donate')
  }
  */

  public githubDistro(): void {
    this.browserService.openUrl('https://github.com/airgap-it/airgap-distro')
  }

  public githubWebSigner(): void {
    this.browserService.openUrl('https://github.com/airgap-it/airgap-web-signer')
  }

  public githubWallet(): void {
    this.browserService.openUrl('https://github.com/airgap-it')
  }

  public faq(): void {
    this.browserService.openUrl('https://airgap.it/#faq')
  }

  public aboutBeacon(): void {
    this.browserService.openUrl('https://walletbeacon.io')
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
