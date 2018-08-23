import { Component } from '@angular/core'
import { Platform, ViewController } from 'ionic-angular'

declare var cordova: any

@Component({
  selector: 'page-introduction',
  templateUrl: 'introduction.html'
})
export class IntroductionPage {
  public security: string = 'highest'

  constructor(private viewController: ViewController, private platform: Platform) { }

  public dismiss() {
    this.viewController.dismiss()
  }

  public downloadClient() {
    this.openUrl('https://github.com/airgap-it')
  }

  public downloadApp() {
    // This should open App Store and not InAppBrowser
    if (this.platform.is('android')) {
      window.open('https://play.google.com/store/apps/details?id=it.airgap.vault')
    } else if (this.platform.is('ios')) {
      window.open('itms-apps://itunes.apple.com/app/id1417126841')
    }
    this.dismiss()
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

}
