import { Platform } from '@ionic/angular'
import { WalletStorageService, themeOptions, WalletStorageKey } from './../storage/storage'
import { STATUS_BAR_PLUGIN } from '@airgap/angular-core'
import { Inject, Injectable } from '@angular/core'
import { StatusBarPlugin, Style } from '@capacitor/status-bar'
import { Subject } from 'rxjs'
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public themeSubject: Subject<themeOptions> = new Subject()

  public readonly supportsSystemPref = CSS.supports('color-scheme', 'dark')

  constructor(
    private readonly platform: Platform,
    private readonly storage: WalletStorageService,
    @Inject(STATUS_BAR_PLUGIN) private readonly statusBar: StatusBarPlugin
  ) {}

  public async register() {
    this.systemThemeQuery().addEventListener('change', async () => {
      const theme = await this.getTheme()

      if (theme === 'system' || theme == null) {
        this.themeSubject.next(theme)
      }
    })

    this.themeSubject.subscribe(async (theme) => {
      if (await this.isDarkMode(theme)) {
        this.toggleDarkMode(true)
        this.statusBarStyleDark(true)

        return
      }

      this.statusBarStyleDark(false)
      this.toggleDarkMode(false)
    })

    this.themeSubject.next(await this.getTheme())
  }

  public async statusBarStyleDark(isDarkMode: boolean) {
    if (this.platform.is('hybrid')) {
      Promise.all([
        this.statusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light }),
        this.statusBar.setBackgroundColor({ color: isDarkMode ? '#1f1f1f' : '#FFFFFF' })
      ])
    }
  }

  public async isDarkMode(theme?: any): Promise<boolean> {
    theme = theme ?? (await this.getTheme())

    if (theme === 'dark' || this.systemPrefersDark(theme)) {
      return true
    }

    return false
  }

  public toggleDarkMode(enabled: boolean): void {
    document.body.classList.toggle('dark', enabled)
  }

  public async setStorageItem(theme: themeOptions): Promise<void> {
    return this.storage.set(WalletStorageKey.THEME, theme)
  }

  public async getTheme(): Promise<themeOptions> {
    const storageItem = await this.storage.get(WalletStorageKey.THEME)

    if (storageItem == null) {
      return this.fallBackTheme()
    }

    return storageItem
  }

  public systemThemeQuery(): MediaQueryList {
    return window.matchMedia('(prefers-color-scheme: dark)')
  }

  private fallBackTheme(): themeOptions {
    return this.supportsSystemPref ? 'system' : 'light'
  }

  private systemPrefersDark(theme: themeOptions): boolean {
    return theme === 'system' && this.systemThemeQuery().matches
  }
}
