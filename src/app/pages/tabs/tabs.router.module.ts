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
            loadChildren: () => import('../portfolio/portfolio.module').then((m) => m.PortfolioPageModule)
          }
        ]
      },
      {
        path: 'scan',
        children: [
          {
            path: '',
            loadChildren: () => import('../scan/scan.module').then((m) => m.ScanPageModule)
          }
        ]
      },
      {
        path: 'exchange',
        children: [
          {
            path: '',
            loadChildren: () => import('../exchange/exchange.module').then((m) => m.ExchangePageModule)
          }
        ]
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadChildren: () => import('../settings/settings.module').then((m) => m.SettingsPageModule)
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
