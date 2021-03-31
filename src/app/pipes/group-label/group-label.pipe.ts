import { Pipe, PipeTransform } from '@angular/core'

import { AirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'

@Pipe({
  name: 'groupLabel'
})
export class GroupLabelPipe implements PipeTransform {
  public transform(group: AirGapMarketWalletGroup | undefined | null): string {
    if (group === undefined || group === null) {
      return 'group-label.all'
    }

    if (group.label === undefined) {
      return 'group-label.ungrouped'
    }

    return group.label
  }
}
