import { ValidatorService } from './../../services/validator/validator.service'
import { Component, OnInit } from '@angular/core'
import { CosmosValidator, CosmosDelegation } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient'
import { ActivatedRoute } from '@angular/router'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Component({
  selector: 'delegation-validator-list',
  templateUrl: './delegation-validator-list.page.html',
  styleUrls: ['./delegation-validator-list.page.scss']
})
export class DelegationValidatorListPage {
  public allValidators: CosmosValidator[]
  public myValidators: CosmosValidator[]
  public delegations: CosmosDelegation[]
  public wallet: AirGapMarketWallet

  constructor(private readonly validatorService: ValidatorService, private readonly route: ActivatedRoute) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.fetchDelegations(this.wallet.addresses[0])
      this.fetchValidatorList()
    }
  }

  private async fetchValidatorList() {
    this.allValidators = await this.validatorService.fetchValidators()
  }

  private async fetchDelegations(address: string) {
    this.delegations = await this.validatorService.fetchDelegations(address)
    const validatorPromise = this.delegations.map(delegation => this.validatorService.fetchValidator(delegation.validator_address))
    this.myValidators = await Promise.all(validatorPromise)
  }
}
