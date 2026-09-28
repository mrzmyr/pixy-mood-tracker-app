// Calendar day IDs use local dates; UTC can point to yesterday after midnight.
const toId = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const now = new Date();
output.today = toId(now);
// The `year` fixture starts 364 days back, so 370 days back has no entry.
const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 370);
output.pastDay = toId(past);
// Recent past days, for entries on separate days.
for (const daysAgo of [1, 2, 3]) {
  output[`daysAgo${daysAgo}`] = toId(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
  );
}
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
output.runId = now.getTime().toString(36);
