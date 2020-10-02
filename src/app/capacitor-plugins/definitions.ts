export type AndroidFlavor = 'playstore' | 'fdroid'

export interface AppInfoPlugin {
  get(): Promise<{ appName: string; packageName: string; versionName: string; versionCode: number; productFlavor?: AndroidFlavor }>
}
