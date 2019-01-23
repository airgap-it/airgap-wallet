import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'
import { getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'

declare let window

@Component({
  selector: 'page-account-import-onboarding',
  templateUrl: 'account-import-onboarding.html'
})
export class AccountImportOnboardingPage {
  public protocol: ICoinProtocol

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform) {
    this.protocol = getProtocolByIdentifier(this.navParams.get('protocolIdentifier'))
  }

  openVault() {
    let dataUrl = '' // TODO: Define "create account" deeplink
    let sApp
    if (this.platform.is('android')) {
      sApp = window.startApp.set({
        action: 'ACTION_VIEW',
        uri: dataUrl,
        flags: ['FLAG_ACTIVITY_NEW_TASK']
      })
    } else if (this.platform.is('ios')) {
      sApp = window.startApp.set(dataUrl)
    }
    sApp.start(
      () => {
        console.log('OK')
      },
      error => {
        alert('Oops. Something went wrong here. Do you have AirGap Vault installed on the same Device?')
        console.log('CANNOT OPEN VAULT', dataUrl, error)
      }
    )
  }
}
