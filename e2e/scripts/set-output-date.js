// Sets output.monthYear like "July 2026" (device locale assumed English)
const months = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();
output.monthYear = months[now.getMonth()] + ' ' + now.getFullYear();
output.today = now.toISOString().slice(0, 10);
output.scrollHint = 'The future will be great.';
