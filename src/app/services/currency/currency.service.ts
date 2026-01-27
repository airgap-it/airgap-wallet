import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { WalletStorageService, FiatCurrencyType, WalletStorageKey, FIAT_CURRENCY_SYMBOL } from '../storage/storage'

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private readonly currencySubject: BehaviorSubject<FiatCurrencyType> = new BehaviorSubject<FiatCurrencyType>(FiatCurrencyType.USD)

  public readonly currency$: Observable<FiatCurrencyType> = this.currencySubject.asObservable()

  public constructor(private readonly storage: WalletStorageService) {}

  public async init(): Promise<void> {
    const storedCurrency = await this.storage.get(WalletStorageKey.FIAT_CURRENCY)
    if (storedCurrency) {
      this.currencySubject.next(storedCurrency)
    }
  }

  public async setCurrency(currency: FiatCurrencyType): Promise<void> {
    await this.storage.set(WalletStorageKey.FIAT_CURRENCY, currency)
    this.currencySubject.next(currency)
  }

  public getCurrency(): FiatCurrencyType {
    return this.currencySubject.getValue()
  }

  public getCurrencySymbol(currency?: FiatCurrencyType): string {
    return FIAT_CURRENCY_SYMBOL[currency ?? this.getCurrency()]
  }
}
