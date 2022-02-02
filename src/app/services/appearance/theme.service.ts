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

  public register() {
    this.systemThemeQuery().addEventListener('change', () => {
      this.themeSubject.next(this.getTheme())
    })

    this.themeSubject.subscribe((theme) => {
      if (this.isDarkMode(theme)) {
        this.toggleDarkMode(true)
        return
      }

      this.toggleDarkMode(false)
    })

    this.themeSubject.next(this.getTheme())
  }

  public isDarkMode(theme?: themeOptions): boolean {
    theme = theme ?? this.getTheme()

    if (theme === 'dark' || this.systemPrefersDark(theme)) {
      return true
    }

    return false
  }

  public toggleDarkMode(enabled: boolean): void {
    document.body.classList.toggle('dark', enabled)
  }

  public setStorageItem(theme: themeOptions): void {
    localStorage.setItem(this.storageKey, theme)
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

  private systemPrefersDark(theme: themeOptions): boolean {
    return theme === 'system' && this.systemThemeQuery().matches
  }
}
