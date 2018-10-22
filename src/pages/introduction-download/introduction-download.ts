import { Component } from '@angular/core'
import { Platform, IonicPage, NavController, ViewController } from 'ionic-angular'

/**
 * Generated class for the IntroductionDownloadPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-introduction-download',
  templateUrl: 'introduction-download.html'
})
export class IntroductionDownloadPage {
  constructor(public navCtrl: NavController, private platform: Platform, public viewController: ViewController) {}

  public dismiss() {
    this.viewController.dismiss()
  }

  public downloadAndroid() {
    window.open('https://play.google.com/store/apps/details?id=it.airgap.vault')
    this.dismiss()
  }

  public downloadIos() {
    window.open('itms-apps://itunes.apple.com/app/id1417126841')
    this.dismiss()
  }

  public downloadDistribution() {
    window.open('https://github.com/airgap-it/airgap-distro')
    this.dismiss()
  }
}
