import { Component } from '@angular/core'
import { ModalController, NavParams } from '@ionic/angular'
import { ICoinProtocol } from 'airgap-coin-lib'

@Component({
  selector: 'page-protocol-select',
  templateUrl: 'protocol-select.html'
})
export class ProtocolSelectPage {
  public searchTerm: string = ''

  public selectedProtocol: string
  public protocols: ICoinProtocol[]
  public filteredProtocols: ICoinProtocol[]

  constructor(public navParams: NavParams, public viewCtrl: ModalController) {
    this.selectedProtocol = this.navParams.get('selectedProtocol')
    this.protocols = this.navParams.get('protocols')
    this.searchTermChanged()
  }

  public dismiss() {
    this.viewCtrl.dismiss()
  }

  public onModelChange($event) {
    this.viewCtrl.dismiss(this.selectedProtocol)
  }

  public searchTermChanged() {
    this.filteredProtocols = this.filterProtocols()
  }

  private filterProtocols() {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase()

    return this.protocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
  }
}
