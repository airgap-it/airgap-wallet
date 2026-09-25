import { Platform } from '@ionic/angular'
import { STATUS_BAR_PLUGIN } from '@airgap/angular-core'
import { Inject, Injectable } from '@angular/core'
import { StatusBarPlugin, Style } from '@capacitor/status-bar'
import { Subject } from 'rxjs'
import { WalletStorageService, themeOptions, WalletStorageKey } from './../storage/storage'
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support'

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public themeSubject: Subject<themeOptions> = new Subject()

  public readonly supportsSystemPref = CSS.supports('color-scheme', 'dark')

  public constructor(
    private readonly platform: Platform,
    private readonly storage: WalletStorageService,
    @Inject(STATUS_BAR_PLUGIN) private readonly statusBar: StatusBarPlugin
  ) {}

  /**
   * The last applied theme is mirrored to `localStorage` under this key. The inline
   * script in `index.html` reads it before Angular boots so the very first paint
   * already has the right colors; the real setting lives in `WalletStorageService`.
   */
  public static readonly LOCAL_STORAGE_MIRROR_KEY: string = 'airgap-theme'

  /** Applies the stored theme and keeps following changes. Resolves once the theme is applied. */
  public async register(): Promise<void> {
    this.systemThemeQuery().addEventListener('change', async () => {
      const theme = await this.getTheme()

      if (theme === 'system' || theme == null) {
        this.themeSubject.next(theme)
      }
    })

    this.themeSubject.subscribe((theme: themeOptions) => {
      this.applyTheme(theme).catch(console.error)
    })

    await this.applyTheme(await this.getTheme())
  }

  private async applyTheme(theme: themeOptions): Promise<void> {
    const isDarkMode: boolean = await this.isDarkMode(theme)
    this.toggleDarkMode(isDarkMode)
    this.rememberTheme(theme)
    await this.statusBarStyleDark(isDarkMode)
  }

  private rememberTheme(theme: themeOptions): void {
    try {
      localStorage.setItem(ThemeService.LOCAL_STORAGE_MIRROR_KEY, theme ?? this.fallBackTheme())
    } catch {
      // Storage unavailable: the first paint falls back to the system preference.
    }
  }

  public async statusBarStyleDark(isDarkMode: boolean) {
    if (this.platform.is('hybrid')) {
      Promise.all([
        this.statusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light }),
        this.statusBar.setBackgroundColor({ color: isDarkMode ? '#1f1f1f' : '#FFFFFF' })
      ])
    }
    if (this.platform.is('android')) {
      await EdgeToEdge.setBackgroundColor({ color: isDarkMode ? '#1f1f1f' : '#FFFFFF' })
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
