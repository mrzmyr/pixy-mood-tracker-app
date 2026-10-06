import type { LocationGeocodedAddress } from "expo-location";
import { formatPlaceName, getLocationLabel } from "../places";

const address = (
  fields: Partial<LocationGeocodedAddress>
): LocationGeocodedAddress => ({
  city: null,
  district: null,
  streetNumber: null,
  street: null,
  region: null,
  subregion: null,
  country: null,
  postalCode: null,
  name: null,
  isoCountryCode: null,
  timezone: null,
  formattedAddress: null,
  ...fields,
});

describe("formatPlaceName()", () => {
  test("joins district and city", () => {
    expect(
      formatPlaceName(
        address({
          district: "Mitte",
          city: "Berlin",
          street: "Unter den Linden",
        })
      )
    ).toBe("Mitte, Berlin");
  });

  test("shows a place once when district and city match", () => {
    expect(
      formatPlaceName(address({ district: "Hamburg", city: "Hamburg" }))
    ).toBe("Hamburg");
  });

  test("falls back to coarser fields without a city", () => {
    expect(
      formatPlaceName(address({ name: "Zugspitze", region: "Bavaria" }))
    ).toBe("Zugspitze, Bavaria");
  });

  test("returns null for an empty address", () => {
    expect(formatPlaceName(address({}))).toBeNull();
  });
});

describe("getLocationLabel()", () => {
  test("shows rounded coordinates when the place has no name", () => {
    expect(
      getLocationLabel({ latitude: 52.52008, longitude: 13.40495, name: null })
    ).toBe("52.520, 13.405");
  });
});
