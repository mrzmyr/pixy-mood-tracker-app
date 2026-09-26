// Calendar day IDs use local dates; UTC can point to yesterday after midnight.
const now = new Date();
output.today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
output.runId = now.getTime().toString(36);
