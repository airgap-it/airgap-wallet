import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router'
import { DataServiceKey } from '../data/data.service'

@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(public readonly router: Router) {}
  public canActivate(route: ActivatedRouteSnapshot): boolean {
    const serviceID = route.params.id

    if (!Object.values(DataServiceKey).includes(serviceID)) {
      window.alert("The service you're trying to access is invalid")
      this.router.navigateByUrl('/')
    }
    return Object.values(DataServiceKey).includes(serviceID)
  }
}
