// Sets output.today like "2026-07-01" for flows that select today
output.today = new Date().toISOString().slice(0, 10);
