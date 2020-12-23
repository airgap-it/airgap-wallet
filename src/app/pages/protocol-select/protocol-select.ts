import { Component } from '@angular/core'
import { ModalController, NavParams } from '@ionic/angular'
import { ICoinProtocol } from '@airgap/coinlib-core'

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

  public async dismiss(): Promise<void> {
    await this.viewCtrl.dismiss()
  }

  public async onModelChange(): Promise<void> {
    await this.viewCtrl.dismiss(this.selectedProtocol)
  }

  public searchTermChanged(): void {
    this.filteredProtocols = this.filterProtocols()
  }

  private filterProtocols(): ICoinProtocol[] {
    const lowerCaseSearchTerm: string = this.searchTerm.toLowerCase()

    return this.protocols.filter(
      (protocol: ICoinProtocol) =>
        protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
  }
}
