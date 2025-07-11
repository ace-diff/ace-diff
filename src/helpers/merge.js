/**
 * Simple is object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
  return (
    item && typeof item === 'object' && !Array.isArray(item) && item !== null
  )
}

/**
 * Deep merge two objects.
 * @param target
 * @param source
 */
export default function merge(target, source) {
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (key === '__proto__' || key === 'constructor') return
      if (isObject(source[key])) {
        if (!target[key] || !isObject(target[key])) {
          target[key] = source[key]
        }
        if (target[key] != source[key]) {
          merge(target[key], source[key]);
        }
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    })
  }
  return target
}
