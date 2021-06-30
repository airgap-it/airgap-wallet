import { Pipe, PipeTransform } from '@angular/core'

import { ActiveWalletGroup } from '../../services/account/account.provider'

@Pipe({
  name: 'groupLabel'
})
export class GroupLabelPipe implements PipeTransform {
  public transform(group: ActiveWalletGroup): string {
    if (group === 'all') {
      return 'group-label.all'
    }

    if (group.label === undefined) {
      return 'group-label.ungrouped'
    }

    return group.label
  }
}
