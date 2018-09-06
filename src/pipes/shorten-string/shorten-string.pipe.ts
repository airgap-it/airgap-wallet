import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'shortenString'
})
export class ShortenStringPipe implements PipeTransform {
  transform(value: string) {
    if (!value) {
      return ''
    }
    
    let result = value
    if (value.length >= 12) {
      result = `${value.substr(0, 5)}...${value.substr(-5)}`
    }
    return result
  }
}
