import { Injectable } from '@angular/core'
import { AlertButton, AlertInput, AlertOptions } from '@ionic/core'
import { TranslateService } from '@ngx-translate/core'

@Injectable({
  providedIn: 'root'
})
// Called "LanguageSerivce" instead of "TranslateService" to not cause confusion with the ngx-translate service.
export class LanguageService {
  constructor(private readonly translateService: TranslateService) {}

  // TODO: add missing fields and handle empty/unused fields
  public async getTranslatedAlert(header: string, message: string, inputs: AlertInput[], buttons: AlertButton[]): Promise<AlertOptions> {
    const translationKeys = [header, message, ...inputs.map(input => input.placeholder), ...buttons.map(button => button.text)]

    const values = await this.translateService.get(translationKeys).toPromise()
    inputs.forEach(input => (input.placeholder = values[input.placeholder]))
    buttons.forEach(button => (button.text = values[button.text]))

    return {
      header: values[header],
      message: values[message],
      inputs,
      buttons
    }
  }
}
