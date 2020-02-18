import { Injectable } from '@angular/core'
import { MarketDataService } from '../market-data/market-data.service'

export enum CustomEnum {
  AVAILABLE_TO_CURRENCY = 'getAvailableToCurrenciesForCurrency',
  MIN_AMOUNT = 'getMinAmountForCurrency',
  EXCHANGE_AMOUNT_FROM = 'getExchangeAmountFrom',
  EXCHANGE_AMOUNT_TO = 'getExchangeAmountTo'
}

@Injectable({
  providedIn: 'root'
})
export class CustomExchangeService {
  constructor(public marketDataService: MarketDataService) {}

  async customLogicTZBTC(methodName: CustomEnum, amount?: string): any {
    switch (methodName) {
      case CustomEnum.MIN_AMOUNT:
        return '0'
      case CustomEnum.EXCHANGE_AMOUNT_FROM:
        return amount
      case CustomEnum.EXCHANGE_AMOUNT_TO:
        return amount
      case CustomEnum.AVAILABLE_TO_CURRENCY:
        return ['btc']
    }
  }
}
