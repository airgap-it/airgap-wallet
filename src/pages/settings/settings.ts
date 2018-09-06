import { Component } from '@angular/core'
import { ModalController, NavController, Platform } from 'ionic-angular'

import { AboutPage } from '../about/about'
import { IntroductionPage } from '../introduction/introduction'

declare var window: any
declare var cordova: any

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {

  constructor(public navCtrl: NavController, private modalController: ModalController, public platform: Platform) {
  }

  public about() {
    this.navCtrl.push(AboutPage)
  }

  public share() {
    let options = {
      message: 'Take a look at the app I found. It\s the most secure practical way to do crypto transactions.',
      // not supported on some apps (Facebook, Instagram)
      subject: 'Checkout airgap.it', // fi. for email
      url: 'https://www.airgap.it',
      chooserTitle: 'Pick an app' // Android only, you can override the default share sheet title
    }

    let onSuccess = function (result: any) {
      console.log(`Share completed: ${result.completed}`) // On Android apps mostly return false even while it's true
      console.log(`Shared to app: ${result.app}`)
      // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    }

    let onError = function (msg: string) {
      console.log('Sharing failed with message: ' + msg)
    }

    window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError)
  }

  public introduction() {
    this.modalController.create(IntroductionPage).present()
  }

  public feedback() {
    this.openUrl('https://github.com/airgap-it/airgap-wallet/issues')
  }

  public telegram() {
    this.openUrl('https://t.me/AirGap')
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
