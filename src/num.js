// Big-number formatting in the Honey Bee Park style: K M B T then aa, ab, ac...
const SHORT = ['', 'K', 'M', 'B', 'T'];

function letters(i) {
  const a = Math.floor(i / 26), b = i % 26;
  return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
}

export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : String(Math.floor(n));
  const tier = Math.floor(Math.log10(n) / 3);
  const scaled = n / Math.pow(1000, tier);
  const suffix = tier < SHORT.length ? SHORT[tier] : letters(tier - SHORT.length);
  const s = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return (s.includes('.') ? s.replace(/\.?0+$/, '') : s) + suffix;
}

export const pct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(v * 100 % 1 ? 1 : 0) + '%';

export function clock(sec) {
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return sec + 's';
  if (sec < 3600) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
