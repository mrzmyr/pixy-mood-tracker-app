// Sets today's date and a unique value for log-entry test data.
const now = new Date();
output.today = now.toISOString().slice(0, 10);
output.runId = now.getTime().toString(36);
