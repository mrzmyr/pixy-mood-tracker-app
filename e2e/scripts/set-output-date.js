// Calendar day IDs use local dates; UTC can point to yesterday after midnight.
const toId = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const now = new Date();
output.today = toId(now);
// The `year` fixture starts 364 days back, so 370 days back has no entry.
const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 370);
output.pastDay = toId(past);
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
// Month and Year Report titles, in English.
output.monthTitle = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
output.year = String(now.getFullYear());
// Three months back: the year view opens this month in the month view.
const pastMonth = new Date(now.getFullYear(), now.getMonth() - 3, 1);
output.pastMonth = toId(pastMonth).slice(0, 7);
output.pastMonthFirstDay = toId(pastMonth);
output.runId = now.getTime().toString(36);
