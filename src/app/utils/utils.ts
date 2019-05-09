// https://stackoverflow.com/a/8472700/4790610
export function generateGUID(): string {
  // tslint:disable
  if (typeof window.crypto !== 'undefined' && typeof window.crypto.getRandomValues !== 'undefined') {
    // If we have a cryptographically secure PRNG, use that
    // https://stackoverflow.com/questions/6906916/collisions-when-generating-uuids-in-javascript
    const buf = new Uint16Array(8)
    window.crypto.getRandomValues(buf)
    const S4 = function(num) {
      let ret = num.toString(16)
      while (ret.length < 4) {
        ret = '0' + ret
      }

      return ret
    }

    return S4(buf[0]) + S4(buf[1]) + '-' + S4(buf[2]) + '-' + S4(buf[3]) + '-' + S4(buf[4]) + '-' + S4(buf[5]) + S4(buf[6]) + S4(buf[7])
  } else {
    // Otherwise, just use Math.random
    // https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8

      return v.toString(16)
    })
  }
  // tslint:enable
}
