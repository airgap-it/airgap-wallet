import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve } from '@angular/router'

import { DataService } from '../data/data.service'

@Injectable({
  providedIn: 'root'
})
export class DataResolverService implements Resolve<any> {
  constructor(private dataService: DataService) {}

  resolve(route: ActivatedRouteSnapshot) {
    let id = route.paramMap.get('id')
    return this.dataService.getData(id)
  }
}
