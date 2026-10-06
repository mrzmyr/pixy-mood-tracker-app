import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { CloudStorage, CloudStorageProvider } from "react-native-cloud-storage";
import { connect, readBackupFile, resume } from "../cloud";

const DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

const user = (scopes: string[]) => ({
  idToken: null,
  serverAuthCode: null,
  scopes,
  user: {
    id: "user",
    email: "user@example.com",
    name: null,
    givenName: null,
    familyName: null,
    photo: null,
  },
});

describe("Google Drive connect", () => {
  beforeEach(() => {
    jest
      .spyOn(CloudStorage, "getProvider")
      .mockReturnValue(CloudStorageProvider.GoogleDrive);
    jest.spyOn(CloudStorage, "setProviderOptions").mockImplementation(() => {});
    jest.spyOn(GoogleSignin, "hasPlayServices").mockResolvedValue(true);
    jest
      .spyOn(GoogleSignin, "getTokens")
      .mockResolvedValue({ accessToken: "token", idToken: "id" });
    jest.spyOn(GoogleSignin, "signOut").mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("connects when the user allows Drive access", async () => {
    jest.spyOn(GoogleSignin, "signIn").mockResolvedValue({
      type: "success",
      data: user([DRIVE_APPDATA_SCOPE]),
    });

    await expect(connect()).resolves.toBe(true);
    expect(CloudStorage.setProviderOptions).toHaveBeenCalledWith({
      accessToken: "token",
    });
  });

  test("asks again when the Drive checkbox stayed unticked", async () => {
    jest
      .spyOn(GoogleSignin, "signIn")
      .mockResolvedValue({ type: "success", data: user([]) });
    jest.spyOn(GoogleSignin, "addScopes").mockResolvedValue({
      type: "success",
      data: user([DRIVE_APPDATA_SCOPE]),
    });

    await expect(connect()).resolves.toBe(true);
    expect(GoogleSignin.addScopes).toHaveBeenCalledWith({
      scopes: [DRIVE_APPDATA_SCOPE],
    });
  });

  test("stays off and signs out without Drive access", async () => {
    jest
      .spyOn(GoogleSignin, "signIn")
      .mockResolvedValue({ type: "success", data: user([]) });
    jest
      .spyOn(GoogleSignin, "addScopes")
      .mockResolvedValue({ type: "success", data: user([]) });

    await expect(connect()).resolves.toBe(false);
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(CloudStorage.setProviderOptions).not.toHaveBeenCalled();
  });

  test("resume counts a session without Drive access as signed out", async () => {
    jest
      .spyOn(GoogleSignin, "signInSilently")
      .mockResolvedValue({ type: "success", data: user([]) });

    await expect(resume()).resolves.toBe(false);
  });

  test("revoked Drive access drops the cached token and reads as signed out", async () => {
    jest.spyOn(GoogleSignin, "signIn").mockResolvedValue({
      type: "success",
      data: user([DRIVE_APPDATA_SCOPE]),
    });
    jest.spyOn(GoogleSignin, "clearCachedAccessToken").mockResolvedValue(null);
    jest.spyOn(CloudStorage, "exists").mockRejectedValue(
      Object.assign(new Error("Could not authenticate with Google Drive"), {
        code: "ERR_AUTHENTICATION_FAILED",
      })
    );
    await connect();

    await expect(readBackupFile()).rejects.toMatchObject({
      status: "backup_signed_out",
    });
    expect(GoogleSignin.clearCachedAccessToken).toHaveBeenCalledWith("token");
  });
});
