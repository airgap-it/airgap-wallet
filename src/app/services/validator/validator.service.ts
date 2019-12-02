import { Injectable } from '@angular/core'
import { CosmosProtocol } from 'airgap-coin-lib'
import { CosmosDelegation, CosmosValidator } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient'
import { BigNumber } from 'bignumber.js'
import { CachingService } from '../caching/caching.service'

export interface Uptime {
  address: string
  missed_blocks: number
  over_blocks: number
}

export interface CosmosValidatorInfo {
  alias: string
  rate: string
  status: string
  totalDelegationBalance: BigNumber
}

@Injectable({
  providedIn: 'root'
})
export class ValidatorService {
  public protocol = new CosmosProtocol()

  constructor(private readonly cachingService: CachingService) {}

  public async getValidatorInfo(address: string): Promise<CosmosValidatorInfo> {
    const statusCodes = { 0: 'jailed', 1: 'inactive', 2: 'active' }
    try {
      const validator: CosmosValidator = await this.protocol.fetchValidator(address)

      return {
        alias: validator.description.moniker,
        rate: `${(parseFloat(validator.commission.rate) * 100).toString()}%`,
        status: statusCodes[validator.status],
        totalDelegationBalance: new BigNumber(validator.tokens)
      }
    } catch {
      return {
        alias: 'unknown',
        rate: 'unknown',
        status: 'unknown',
        totalDelegationBalance: undefined
      }
    }
  }

  public async fetchValidators(): Promise<CosmosValidator[]> {
    return this.cachingService.fetchValidators()
  }

  public async fetchVotingPower(address: string): Promise<BigNumber> {
    const validators: CosmosValidator[] = await this.protocol.fetchValidators()
    const validatedAmount = new BigNumber(
      validators.find((validator: CosmosValidator) => validator.operator_address === address).delegator_shares
    )
    const totalDelegatedAmount = new BigNumber(
      validators.map((validator: CosmosValidator) => parseFloat(validator.delegator_shares)).reduce((a, b) => a + b)
    )

    return validatedAmount.div(totalDelegatedAmount)
  }

  public async fetchDelegations(address: string): Promise<CosmosDelegation[]> {
    return this.protocol.fetchDelegations(address)
  }

  public async fetchSelfDelegation(address: string): Promise<BigNumber> {
    const selfDelegation: CosmosDelegation = await this.protocol.fetchSelfDelegation(address)

    return new BigNumber(selfDelegation.shares)
  }

  public async fetchTotalDelegatedAmount(address: string): Promise<BigNumber> {
    const delegations: CosmosDelegation[] = await this.protocol.fetchDelegations(address)

    return new BigNumber(delegations.map(delegation => parseFloat(delegation.shares)).reduce((a, b) => a + b, 0))
  }

  public async fetchValidator(address: string): Promise<CosmosValidator> {
    return this.protocol.fetchValidator(address)
  }
}
