import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router'
import { DataService } from '../data/data.service'

@Injectable()
export class TransactionHashGuard implements CanActivate {
  constructor(public readonly router: Router, public readonly dataService: DataService) {}
  public async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const hash = route.params.hash
    const transaction = await this.dataService.get(hash)
    if (!transaction) {
      window.alert("The transaction you're trying to access is invalid")
      this.router.navigateByUrl('/')
    }
    return transaction !== null
  }
}
