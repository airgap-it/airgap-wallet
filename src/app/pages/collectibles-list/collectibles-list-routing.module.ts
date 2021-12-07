import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CollectiblesListPage } from './collectibles-list.page';

const routes: Routes = [
  {
    path: '',
    component: CollectiblesListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CollectiblesListPageRoutingModule {}
