const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  applyBackupManifestAttributes,
  writeBackupRuleFiles,
} = require("../withAndroidBackupRules");

const createManifest = () => ({
  manifest: {
    $: { "xmlns:android": "http://schemas.android.com/apk/res/android" },
    application: [{ $: { "android:name": ".MainApplication" } }],
  },
});

describe("withAndroidBackupRules", () => {
  test("turns Auto Backup on and points at both rule files", () => {
    const manifest = applyBackupManifestAttributes(createManifest());
    const application = manifest.manifest.application[0].$;

    expect(application["android:allowBackup"]).toBe("true");
    expect(application["android:fullBackupContent"]).toBe(
      "@xml/pixy_backup_rules"
    );
    expect(application["android:dataExtractionRules"]).toBe(
      "@xml/pixy_data_extraction_rules"
    );
    expect(application["android:backupAgent"]).toBe(
      "expo.modules.pixymoodtrackerbackup.PixyBackupAgent"
    );
    expect(application["android:fullBackupOnly"]).toBe("true");
  });

  test("writes rules that include only the database domain", () => {
    const resourceDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "pixy-backup-rules-")
    );

    writeBackupRuleFiles(resourceDirectory);

    const xmlDirectory = path.join(resourceDirectory, "xml");
    const legacyRules = fs.readFileSync(
      path.join(xmlDirectory, "pixy_backup_rules.xml"),
      "utf-8"
    );
    const extractionRules = fs.readFileSync(
      path.join(xmlDirectory, "pixy_data_extraction_rules.xml"),
      "utf-8"
    );

    expect(legacyRules).toContain(
      '<include domain="database" path="." requireFlags="clientSideEncryption" />'
    );
    expect(legacyRules).not.toMatch(
      /domain="(?<other>file|sharedpref|root|external)"/u
    );
    expect(extractionRules).toContain(
      '<cloud-backup disableIfNoEncryptionCapabilities="true">'
    );
    expect(extractionRules).toContain("<device-transfer>");
    expect(extractionRules).not.toMatch(
      /domain="(?<other>file|sharedpref|root|external)"/u
    );

    fs.rmSync(resourceDirectory, { recursive: true, force: true });
  });
});
