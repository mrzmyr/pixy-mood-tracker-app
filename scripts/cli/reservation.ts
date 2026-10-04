// Phone reservations: one file per phone, shared by every checkout on this Mac.
// tools/devices-menu-bar reads these files. Keep field names in sync.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CliError, readJson } from "./shared.ts";

const CACHE_DIR = path.join(os.homedir(), ".cache", "pixy-mood-tracker");
const RESERVATIONS_DIR = path.join(CACHE_DIR, "reservations");
const PHONES_FILE = path.join(CACHE_DIR, "phones.json");
const HOLDER = fs.realpathSync(path.resolve(import.meta.dir, "../.."));

/** Phone identity the menu bar app shows. */
export interface PhoneInfo {
  id: string;
  target: string;
  name: string;
  type: "iPhone" | "iPad" | "Android phone";
}

/** One phone reservation. `holder` is the checkout path that reserved it. */
export interface Reservation extends PhoneInfo {
  holder: string;
  goal: string;
  reservedAt: string;
  expiresAt: string;
}

const fileFor = (id: string) =>
  path.join(RESERVATIONS_DIR, `${id.replaceAll(/[^a-zA-Z0-9-]/gu, "_")}.json`);

const isActive = (reservation: Reservation | null) =>
  reservation !== null &&
  Date.parse(reservation.expiresAt) > Date.now() &&
  fs.existsSync(reservation.holder);

/** Read the active reservation of one phone. Expired or orphaned files count as none. */
export const readReservation = (id: string) => {
  const reservation = readJson<Reservation>(fileFor(id));
  return isActive(reservation) ? reservation : null;
};

/** Active reservation held by another checkout, else null. */
export const readForeignReservation = (id: string) => {
  const reservation = readReservation(id);
  return reservation && reservation.holder !== HOLDER ? reservation : null;
};

const reservedError = (reservation: Reservation) =>
  new CliError({
    status: "device_reserved",
    message: `${reservation.target} is reserved by another checkout`,
    why: `${reservation.holder} reserved it until ${reservation.expiresAt}${reservation.goal ? ` to ${reservation.goal}` : ""}.`,
    fix: "Pick another phone from `bun devices list`, or wait until the other checkout runs `bun devices release`.",
  });

/** Fail when another checkout holds this phone. */
export const assertNotReserved = (id: string) => {
  const reservation = readForeignReservation(id);
  if (reservation) {
    throw reservedError(reservation);
  }
};

/** Reserve one phone for this checkout, or extend this checkout's reservation. */
export const reserve = (phone: PhoneInfo, goal: string, minutes: number) => {
  const { id } = phone;
  fs.mkdirSync(RESERVATIONS_DIR, { recursive: true });
  const file = fileFor(id);
  const now = new Date();
  const reservation: Reservation = {
    ...phone,
    holder: HOLDER,
    goal,
    reservedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + minutes * 60_000).toISOString(),
  };
  const current = readReservation(id);
  if (current && current.holder !== HOLDER) {
    throw reservedError(current);
  }
  if (current || fs.existsSync(file)) {
    // Own, expired, or orphaned reservation: replace it atomically.
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(reservation));
    fs.renameSync(temporary, file);
    const written = readJson<Reservation>(file);
    if (written && written.holder !== HOLDER) {
      throw reservedError(written);
    }
    return reservation;
  }
  try {
    fs.writeFileSync(file, JSON.stringify(reservation), { flag: "wx" });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      // Another checkout reserved it between the read and the write.
      return reserve(phone, goal, minutes);
    }
    throw error;
  }
  return reservation;
};

/** Remove this checkout's reservation of one phone. */
export const release = (id: string) => {
  const current = readReservation(id);
  if (current && current.holder !== HOLDER) {
    throw reservedError(current);
  }
  fs.rmSync(fileFor(id), { force: true });
  return current;
};

/**
 * Replace the known phones. Pass `merge` to add phones without dropping others.
 * The menu bar app counts these phones.
 */
export const writePhones = (phones: PhoneInfo[], merge = false) => {
  const known = merge ? (readJson<PhoneInfo[]>(PHONES_FILE) ?? []) : [];
  const byId = new Map(known.map((phone) => [phone.id, phone]));
  for (const phone of phones) {
    byId.set(phone.id, phone);
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const temporary = `${PHONES_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify([...byId.values()]));
  fs.renameSync(temporary, PHONES_FILE);
};
