const fs = require("node:fs");
const path = require("node:path");

const localesDir = path.join(__dirname, "../assets/locales/");
const filesArray = fs
  .readdirSync(localesDir)
  .filter((file) => fs.lstatSync(localesDir + file).isFile());
const locales = {};
for (const file of filesArray) {
  console.log("reading", file);
  try {
    locales[file.replace(".json", "")] = JSON.parse(
      fs.readFileSync(localesDir + file, "utf-8")
    );
  } catch {
    console.log("error reading", file);
  }
}

console.log("locales", locales);

const REMOVE_KEYS = [];
const removeKeys = new Set(REMOVE_KEYS);

for (const localeKey of Object.keys(locales)) {
  locales[localeKey] = Object.fromEntries(
    Object.entries(locales[localeKey]).filter(([key]) => !removeKeys.has(key))
  );
  fs.writeFileSync(
    `${localesDir + localeKey}.json`,
    JSON.stringify(locales[localeKey], null, 2)
  );
}
