/**
 * Simple is object check.
 */
function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Deep merge two objects.
 */
export default function merge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (key === '__proto__' || key === 'constructor') return
      const sourceValue = source[key]
      const targetValue = target[key]
      if (isObject(sourceValue)) {
        if (!targetValue || !isObject(targetValue)) {
          ;(target as Record<string, unknown>)[key] = sourceValue
        }
        if (targetValue !== sourceValue) {
          merge(
            targetValue as Record<string, unknown>,
            sourceValue as Record<string, unknown>,
          )
        }
      } else {
        Object.assign(target, { [key]: sourceValue })
      }
    })
  }
  return target
}
