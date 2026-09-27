// Calendar day IDs use local dates; UTC can point to yesterday after midnight.
const toId = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const now = new Date();
output.today = toId(now);
// The `year` fixture starts 364 days back, so 370 days back has no entry.
const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 370);
output.pastDay = toId(past);
output.runId = now.getTime().toString(36);
