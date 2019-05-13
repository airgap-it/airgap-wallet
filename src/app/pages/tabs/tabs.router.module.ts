import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { TabsPage } from './tabs.page'

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'portfolio',
        children: [
          {
            path: '',
            loadChildren: '../portfolio/portfolio.module#PortfolioPageModule'
          }
        ]
      },
      {
        path: 'scan',
        children: [
          {
            path: '',
            loadChildren: '../scan/scan.module#ScanPageModule'
          }
        ]
      },
      {
        path: 'exchange',
        children: [
          {
            path: '',
            loadChildren: '../exchange/exchange.module#ExchangePageModule'
          }
        ]
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadChildren: '../settings/settings.module#SettingsPageModule'
          }
        ]
      },
      {
        path: '',
        redirectTo: '/tabs/portfolio',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/portfolio',
    pathMatch: 'full'
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule {}
