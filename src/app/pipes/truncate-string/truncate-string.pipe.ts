import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'truncateString'
})
export class TruncateStringPipe implements PipeTransform {
  public transform(value: string, args: { limit?: number } = {}) {
    if (!value || !(typeof value === 'string')) {
      // console.warn(`ShortenStringPipe: invalid value: ${value}`)
      return ''
    }

    const limit = args.limit ?? 100

    return value.length <= limit ? value : `${value.substr(0, limit)}...`
  }
}
