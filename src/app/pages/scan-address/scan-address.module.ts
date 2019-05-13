import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { ZXingScannerModule } from '@zxing/ngx-scanner'

import { ComponentsModule } from '../../components/components.module'

import { ScanAddressPage } from './scan-address'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    ZXingScannerModule,
    RouterModule.forChild([{ path: '', component: ScanAddressPage }])
  ],
  declarations: [ScanAddressPage]
})
export class ScanAddressPageModule {}
