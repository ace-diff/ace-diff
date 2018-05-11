export default function normalizeContent(defaultValue) {
  const value = (defaultValue === undefined) ? '' : defaultValue;
  return value.replace(/\r\n/g, '\n');
}
