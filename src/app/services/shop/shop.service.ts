import { Injectable } from '@angular/core'
import axios, { AxiosResponse } from 'axios'

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  public shopJSONUrl: string = 'https://airgap.it/wallet-announcement/'
  public knoxJSONUrl: string = 'https://airgap.it/wallet-knox-ad/'
  public corsUrl: string = 'https://cors-proxy.airgap.prod.gke.papers.tech/proxy?url='
  public shopBannerText: string = ''
  public shopBannerLink: string = ''

  private async fetchData(url: string) {
    const data = await axios.get(url)
    return data
  }

  private assembleRequestUrl(url: string) {
    return `${this.corsUrl}${encodeURI(url)}`
  }

  public async getShopData(): Promise<
    AxiosResponse<{
      text: string
      link: string
    }>
  > {
    const url = this.assembleRequestUrl(this.shopJSONUrl)
    const result = await this.fetchData(url)
    return result
  }

  public async getKnoxData(): Promise<
    AxiosResponse<{
      line1: string
      line2: string
      link: string
    }>
  > {
    const url = this.assembleRequestUrl(this.knoxJSONUrl)
    const result = await this.fetchData(url)
    return result
  }
}
