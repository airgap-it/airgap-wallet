import { Component, ViewChild } from '@angular/core'
import { NavController, NavParams, Platform, Slides } from 'ionic-angular'
import { getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'
import { DeepLinkProvider } from '../../providers/deep-link/deep-link'

@Component({
  selector: 'page-account-import-onboarding',
  templateUrl: 'account-import-onboarding.html'
})
export class AccountImportOnboardingPage {
  @ViewChild(Slides)
  slides: Slides

  public protocol: ICoinProtocol

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public platform: Platform,
    private deeplinkProvider: DeepLinkProvider
  ) {
    this.protocol = getProtocolByIdentifier(this.navParams.get('protocolIdentifier'))
  }

  openVault() {
    this.deeplinkProvider.sameDeviceDeeplink('airgap-vault://')
  }
}
