export const paintColours: Record<string, string> = {
  white: '#f2f2f2', black: '#181818', silver: '#b8bcc2', grey: '#70757d',
  gray: '#70757d', red: '#bc2026', blue: '#2455a4', navy: '#162b50',
  green: '#286349', yellow: '#e9bd27', orange: '#d96b21', brown: '#694936',
  beige: '#c9b99a', gold: '#b69a53', purple: '#7545a1', pink: '#d587a7',
};
export function resolvePaintColour(value: string): string {
  const text = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  if (/^#[0-9a-f]{3}$/.test(text)) return '#' + [...text.slice(1)].map(c => c + c).join('');
  return paintColours[text] || '';
}
