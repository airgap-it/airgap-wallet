import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AirGapMarketWallet } from 'airgap-coin-lib'

import { OperationsProvider } from 'src/app/services/operations/operations'
import { NavController } from '@ionic/angular'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'

@Component({
  selector: 'delegation-list',
  templateUrl: './delegation-list.page.html',
  styleUrls: ['./delegation-list.page.scss']
})
export class DelegationListPage {
  public wallet: AirGapMarketWallet

  public delegateeLabel: string

  public searchTerm: string = ''
  public filteredDelegatees: UIAccountSummary[]

  private delegatees: UIAccountSummary[]
  private callback: (address: string) => void

  constructor(
    private readonly route: ActivatedRoute,
    private readonly navController: NavController,
    private readonly operations: OperationsProvider
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.delegateeLabel = info.delegateeLabel
      this.callback = info.callback

      this.operations.getDelegateesSummary(this.wallet, info.currentDelegatees).then(summary => {
        this.delegatees = summary
        this.filteredDelegatees = summary
      })
    }
  }

  public setFilteredItems(searchTerm: string) {
    if (searchTerm.length === 0) {
      this.filteredDelegatees = this.delegatees
    } else {
      this.filteredDelegatees = this.delegatees.filter(delegatee => {
        const searchTermLowerCase = searchTerm.toLowerCase()
        const hasMatchingAddress = delegatee.address.toLowerCase().includes(searchTermLowerCase)
        const hasMatchingName = delegatee.header[0].toLowerCase().includes(searchTermLowerCase)

        return hasMatchingAddress || hasMatchingName
      })
    }
  }

  public navigateToDetails(address: string) {
    this.callback(address)
    this.navController.pop()
  }
}
