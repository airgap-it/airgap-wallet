import { InternalStorageKey, InternalStorageService } from '@airgap/angular-core'
import { Component, OnInit } from '@angular/core'

@Component({
  selector: 'app-trading-settings',
  templateUrl: './trading-settings.page.html',
  styleUrls: ['./trading-settings.page.scss']
})
export class TradingSettingsPage implements OnInit {
  public useMtPerelin: boolean = false

  constructor(private readonly storageService: InternalStorageService) {
    this.storageService.get(InternalStorageKey.SETTINGS_TRADING_USE_MTPELERIN).then((value) => {
      this.useMtPerelin = value
    })
  }

  ngOnInit() {}

  public async toggleUseMtPerelin(event: any) {
    const value = event.detail.checked
    await this.storageService.set(InternalStorageKey.SETTINGS_TRADING_USE_MTPELERIN, value)
  }

  public navigate(path: string) {
    window.open(path, '_blank')
  }
}
