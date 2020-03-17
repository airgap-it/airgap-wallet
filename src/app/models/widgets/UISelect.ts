import { UIWidget, UIWidgetType } from './UIWidget'

export class UISelect extends UIWidget {
  readonly type = UIWidgetType.SELECT
  readonly options: Map<any, string>

  constructor(id: string, readonly label: string, options: [any, string][], readonly defaultOption?: any) {
    super(id)
    this.options = new Map(options)
  }
}
