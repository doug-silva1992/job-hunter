export function matchColor(value: number) {
  if (value >= 85) return 'success.main'
  if (value >= 70) return 'primary.main'
  return 'secondary.main'
}
