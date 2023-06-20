import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot } from '@angular/router'

import { DataService } from '../data/data.service'

@Injectable({
  providedIn: 'root'
})
export class DataResolverService {
  public constructor(private readonly dataService: DataService) {}

  public resolve(route: ActivatedRouteSnapshot) {
    const id = route.paramMap.get('id')

    return this.dataService.getData(id)
  }
}
