/**
 * Formats a number intelligently based on its magnitude.
 * - Numbers < 1000: show full number with up to 2 decimal places
 * - Numbers >= 1000: show with k suffix (e.g., 10.58k)
 * - Numbers >= 1,000,000: show with M suffix (e.g., 1.5M)
 *
 * @param value - The number to format
 * @param maxDecimals - Maximum decimal places (default: 2)
 * @returns Formatted string
 */
export function formatCompactNumber(value: number, maxDecimals: number = 2): string {
  if (value === 0) return '0'

  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 1_000_000) {
    const formatted = (absValue / 1_000_000).toFixed(maxDecimals)
    // Remove trailing zeros after decimal point
    const cleaned = parseFloat(formatted).toString()
    return `${sign}${cleaned}M`
  }

  if (absValue >= 1000) {
    const formatted = (absValue / 1000).toFixed(maxDecimals)
    // Remove trailing zeros after decimal point
    const cleaned = parseFloat(formatted).toString()
    return `${sign}${cleaned}k`
  }

  // For smaller numbers, show with appropriate precision
  if (Number.isInteger(value)) {
    return value.toLocaleString()
  }

  // For decimals, limit to maxDecimals and remove trailing zeros
  const formatted = absValue.toFixed(maxDecimals)
  const cleaned = parseFloat(formatted).toString()
  return `${sign}${cleaned}`
}
