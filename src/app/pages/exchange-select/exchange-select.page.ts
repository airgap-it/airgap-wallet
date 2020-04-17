import { ExchangeProvider } from './../../services/exchange/exchange'
import { Component } from '@angular/core'
import { ModalController, NavParams } from '@ionic/angular'

@Component({
  selector: 'page-exchange-select',
  templateUrl: 'exchange-select.page.html'
})
export class ExchangeSelectPage {
  public selectedExchange: string

  constructor(public navParams: NavParams, public viewCtrl: ModalController, private readonly exchangeProvider: ExchangeProvider) {
    this.selectedExchange = this.navParams.get('activeExchange')
  }
  public async dismiss(): Promise<void> {
    await this.viewCtrl.dismiss()
  }

  public async onModelChange(): Promise<void> {
    this.exchangeProvider.setActiveExchange(this.selectedExchange)
    await this.viewCtrl.dismiss()
  }
}
