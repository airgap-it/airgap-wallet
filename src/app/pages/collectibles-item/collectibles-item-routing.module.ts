import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CollectiblesItemPage } from './collectibles-item.page';

const routes: Routes = [
  {
    path: '',
    component: CollectiblesItemPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CollectiblesItemPageRoutingModule {}
