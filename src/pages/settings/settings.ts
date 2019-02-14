import { Component } from '@angular/core'
import { ModalController, NavController, Platform, AlertController } from 'ionic-angular'

import { AboutPage } from '../about/about'
import { IntroductionPage } from '../introduction/introduction'
import { TranslateService } from '@ngx-translate/core'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

declare var window: any
declare var cordova: any

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {
  constructor(
    public navCtrl: NavController,
    private modalController: ModalController,
    private pipe: TranslateService,
    public platform: Platform,
    public alertCtrl: AlertController
  ) {}

  public about() {
    this.navCtrl.push(AboutPage).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public share() {
    let options = {
      message: 'Take a look at the app I found. Its the most secure practical way to do crypto transactions.',
      // not supported on some apps (Facebook, Instagram)
      subject: 'Checkout airgap.it', // fi. for email
      url: 'https://www.airgap.it',
      chooserTitle: 'Pick an app' // Android only, you can override the default share sheet title
    }

    let onSuccess = function(result: any) {
      console.log(`Share completed: ${result.completed}`) // On Android apps mostly return false even while it's true
      console.log(`Shared to app: ${result.app}`)
      // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    }

    let onError = function(msg: string) {
      console.log('Sharing failed with message: ' + msg)
    }

    window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError)
  }

  public introduction() {
    this.modalController
      .create(IntroductionPage)
      .present()
      .catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }

  public feedback() {
    this.openUrl('https://github.com/airgap-it/airgap-wallet/issues')
  }

  public telegram() {
    let alert = this.alertCtrl.create({
      title: this.pipe.instant('settings.alert_title')
    })
    alert.addInput({
      type: 'radio',
      label: this.pipe.instant('settings.channel.international'),
      value: 'International'
    })
    alert.addInput({
      type: 'radio',
      label: this.pipe.instant('settings.channel.chinese'),
      value: 'Chinese'
    })
    alert.addButton(this.pipe.instant('settings.alert_cancel'))
    alert.addButton({
      text: this.pipe.instant('settings.telegram_label'),
      handler: data => {
        switch (data) {
          case 'International':
            this.openUrl('https://t.me/AirGap')
            break
          case 'Chinese':
            this.openUrl('https://t.me/AirGap_cn')
            break
        }
      }
    })
    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  public translate() {
    this.openUrl('https://translate.sook.ch/')
  }

  /*
  // Removed because of google policies
  public donate() {
    this.openUrl('https://airgap.it/#donate')
  }
  */

  public githubDistro() {
    this.openUrl('https://github.com/airgap-it/airgap-distro')
  }

  public githubWebSigner() {
    this.openUrl('https://github.com/airgap-it/airgap-web-signer')
  }

  public githubWallet() {
    this.openUrl('https://github.com/airgap-it')
  }

  public faq() {
    this.openUrl('https://airgap.it/#faq')
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }
}
