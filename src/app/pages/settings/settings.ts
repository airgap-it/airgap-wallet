import { ClipboardService, SerializerService, IACMessageTransport } from '@airgap/angular-core'
import { Component, Inject } from '@angular/core'
import { Router } from '@angular/router'
import { SharePlugin } from '@capacitor/core'
import { AlertController, ModalController, Platform } from '@ionic/angular'
import { SHARE_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'
import { BrowserService } from 'src/app/services/browser/browser.service'
import { IACService } from 'src/app/services/iac/iac.service'

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
    private readonly clipboardProvider: ClipboardService,
    private readonly iacService: IACService,
    private readonly browserService: BrowserService,
    @Inject(SHARE_PLUGIN) private readonly sharePlugin: SharePlugin
  ) {}

  public about(): void {
    this.router.navigateByUrl('/about').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public dappPermissions(): void {
    this.router.navigateByUrl('/dapp-permission-list').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public dappSettings(): void {
    this.router.navigateByUrl('/settings-beacon').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public share(): void {
    const options = {
      title: 'Check out AirGap Wallet', // Set a title for any message. This will be the subject if sharing to email
      text: "Take a look at this app I found. It's the most secure way to do crypto transactions.", // Set some text to share
      url: 'https://www.airgap.it', // Set a URL to share
      dialogTitle: 'Pick an app' // Set a title for the share modal. Android only
    }

    this.sharePlugin
      .share(options)
      .then((result) => {
        console.log(`Share completed: ${result}`)
      })
      .catch((error) => {
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

  public async discord(): Promise<void> {
    this.browserService.openUrl('https://discord.gg/gnWqCQsteh')
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
    this.browserService.openUrl('https://support.airgap.it')
  }

  public aboutBeacon(): void {
    this.browserService.openUrl('https://walletbeacon.io')
  }

  public goToQrSettings(): void {
    this.router.navigateByUrl('/qr-settings').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public goToHealthCheck(): void {
    this.router.navigateByUrl('/health-check').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public pasteClipboard(): void {
    this.clipboardProvider.paste().then(
      (text: string) => {
        this.iacService.handleRequest(text, IACMessageTransport.PASTE).catch((error) => console.error(error))
      },
      (err: string) => {
        console.error('Error: ' + err)
      }
    )
  }
}
