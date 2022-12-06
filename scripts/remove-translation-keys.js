const fs = require("fs");

const path = __dirname + "/../assets/locales/";
const filesArray = fs
  .readdirSync(path)
  .filter((file) => fs.lstatSync(path + file).isFile());
const locales = {};
filesArray.forEach((file) => {
  console.log("reading", file);
  try {
    locales[file.replace(".json", "")] = JSON.parse(
      fs.readFileSync(path + file, "utf8")
    );
  } catch (e) {
    console.log("error reading", file);
  }
});

console.log("locales", locales);

const REMOVE_KEYS = [];

for (const localeKey in locales) {
  for (const key of REMOVE_KEYS) {
    delete locales[localeKey][key];
  }
  fs.writeFileSync(
    path + localeKey + ".json",
    JSON.stringify(locales[localeKey], null, 2)
  );
}
