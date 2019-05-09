import { IonicModule } from '@ionic/angular'
import { RouterModule } from '@angular/router'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ScanAddressPage } from './scan-address'
import { ComponentsModule } from '../../components/components.module'
import { TranslateModule } from '@ngx-translate/core'
import { ZXingScannerModule } from '@zxing/ngx-scanner'

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
