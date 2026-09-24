// Sets output.monthYear like "July 2026" (device locale assumed English)
const months = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();
output.monthYear = months[now.getMonth()] + ' ' + now.getFullYear();
output.scrollHint = 'The future will be great.';

// Local calendar dates for past days, matching calendar-day-<YYYY-MM-DD> ids.
const localDate = (daysAgo) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  const pad = (n) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
output.today = localDate(0);
output.daysAgo1 = localDate(1);
output.daysAgo2 = localDate(2);
output.daysAgo3 = localDate(3);
