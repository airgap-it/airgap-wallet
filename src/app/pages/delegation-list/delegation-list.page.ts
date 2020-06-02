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

  public delegateeLabelPlural: string

  public searchTerm: string = ''

  public currentDelegatees: UIAccountSummary[]
  public knownDelegatees: UIAccountSummary[]
  public filteredDelegatees: UIAccountSummary[]

  private callback: (address: string) => void

  constructor(
    private readonly route: ActivatedRoute,
    private readonly navController: NavController,
    private readonly operations: OperationsProvider
  ) {}

  ngOnInit() {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.delegateeLabelPlural = info.delegateeLabelPlural
      this.callback = info.callback

      this.operations.getDelegateesSummary(this.wallet, info.currentDelegatees).then((summary: UIAccountSummary[]) => {
        this.currentDelegatees = summary.filter(summary => info.currentDelegatees.includes(summary.address))
        this.knownDelegatees = summary.filter(summary => !info.currentDelegatees.includes(summary.address))

        this.filteredDelegatees = this.getKnownDelegatees()
      })
    }
  }

  public setFilteredItems(searchTerm: string): void {
    if (searchTerm.length === 0) {
      this.filteredDelegatees = this.getKnownDelegatees()
    } else {
      this.filteredDelegatees = this.knownDelegatees.filter((delegatee: UIAccountSummary) => {
        const searchTermLowerCase: string = searchTerm.toLowerCase()
        const hasMatchingAddress: boolean = delegatee.address.toLowerCase().includes(searchTermLowerCase)
        const hasMatchingName: boolean = delegatee.header[0].toLowerCase().includes(searchTermLowerCase)

        return hasMatchingAddress || hasMatchingName
      })
    }
  }

  public loadMoreItems(event: any): void {
    this.filteredDelegatees = [...this.filteredDelegatees, ...this.getKnownDelegatees(this.filteredDelegatees.length - 1)].filter(
      (value: UIAccountSummary, index: number, array: UIAccountSummary[]) => array.indexOf(value) === index
    )
    event.target.complete()
    if (this.filteredDelegatees.length === this.knownDelegatees.length) {
      event.target.disable = true
    }
  }

  public navigateToDetails(address: string): void {
    this.callback(address)
    this.navController.pop()
  }

  private getKnownDelegatees(startIndex: number = 0, step: number = 10): UIAccountSummary[] {
    return this.knownDelegatees.slice(0, startIndex + step)
  }
}
