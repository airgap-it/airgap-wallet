import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { CosmosValidator } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

import { ValidatorService } from './../../services/validator/validator.service'

@Component({
  selector: 'delegation-validator-list',
  templateUrl: './delegation-validator-list.page.html',
  styleUrls: ['./delegation-validator-list.page.scss']
})
export class DelegationValidatorListPage {
  public searchTerm: string = ''
  public allValidators: CosmosValidator[]
  public filteredValidators: CosmosValidator[]

  public myValidators: CosmosValidator[]
  public wallet: AirGapMarketWallet

  constructor(
    private readonly validatorService: ValidatorService,
    private readonly route: ActivatedRoute,
    public readonly router: Router,
    public readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
    }
  }

  public ngOnInit() {
    this.fetchValidatorList()
    this.fetchDelegations(this.wallet.addresses[0])
  }

  private async fetchValidatorList() {
    this.allValidators = await this.validatorService.fetchValidators()
    this.filteredValidators = this.allValidators.sort((a, b) => parseFloat(a.tokens) - parseFloat(b.tokens)).reverse()
  }

  private async fetchDelegations(address: string) {
    const delegations = await this.validatorService.fetchDelegations(address)
    this.myValidators = await Promise.all(delegations.map(delegation => this.validatorService.fetchValidator(delegation.validator_address)))
  }

  public setFilteredItems(searchTerm: string) {
    this.filteredValidators = this.allValidators.filter(validator => validator.description.moniker.toLowerCase().startsWith(searchTerm))
  }

  public navigate(validatorAddress: string) {
    const info = {
      validatorAddress,
      wallet: this.wallet
    }
    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router.navigateByUrl('/delegation-cosmos/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
