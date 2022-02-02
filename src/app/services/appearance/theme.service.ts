import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'

type themeOptions = 'light' | 'dark' | 'system'

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'theme'

  public themeSubject: Subject<themeOptions> = new Subject()

  public readonly supportsSystemPref = CSS.supports('color-scheme', 'dark')

  constructor() {}

  public register() {
    this.systemThemeQuery().addEventListener('change', () => {
      console.log(this.getTheme())
      this.themeSubject.next(this.getTheme())
    })

    this.themeSubject.subscribe((value: themeOptions) => {
      switch (value) {
        case 'light':
          this.toggleDarkMode(false)
          return
        case 'dark':
          this.toggleDarkMode(true)
          return
        default:
          this.toggleDarkMode(this.systemThemeQuery().matches ? true : false)
          return
      }
    })

    this.themeSubject.next(this.getTheme())
  }

  public isDarkMode(): boolean {
    const theme = this.getTheme()

    if (theme == 'dark' || (theme == 'system' && this.systemThemeQuery().matches)) {
      return true
    }

    return false
  }

  public toggleDarkMode(enabled: boolean): void {
    document.body.classList.toggle('dark', enabled)
  }

  public setStorageItem(pref: themeOptions): void {
    localStorage.setItem(this.storageKey, pref)
  }

  public getTheme(): themeOptions {
    const storageItem: any = localStorage.getItem(this.storageKey)

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
}
