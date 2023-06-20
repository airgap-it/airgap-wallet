import { Injectable } from '@angular/core'
import axios, { AxiosResponse } from 'axios'

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  // Shop banner
  public shopJSONUrl: string = 'https://airgap.it/wallet-announcement/'
  public corsUrl: string = 'https://cors-proxy.airgap.prod.gke.papers.tech/proxy?url='
  public shopBannerText: string = ''
  public shopBannerLink: string = ''

  private async fetchData(url: string) {
    const data = await axios.get<{ text: string; link: string }>(url)
    return data
  }

  private assembleRequestUrl() {
    return `${this.corsUrl}${encodeURI(this.shopJSONUrl)}`
  }

  public async getShopData(): Promise<
    AxiosResponse<{
      text: string
      link: string
    }>
  > {
    const url = this.assembleRequestUrl()
    const result = await this.fetchData(url)
    return result
  }
}
