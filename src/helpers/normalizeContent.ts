export default function normalizeContent(value: string | null = ''): string {
  const normalized = (value ?? '').replace(/\r\n/g, '\n')
  return normalized
}
