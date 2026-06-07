import { describe, it, expect } from "vitest";
import { MEDICATION_DOSAGES } from "../../src/data/medication_dosages";

describe("MEDICATION_DOSAGES", () => {
  it("contains all 10 Table 12-4 medications", () => {
    expect(MEDICATION_DOSAGES).toHaveLength(10);
  });

  it("has unique ids", () => {
    const ids = MEDICATION_DOSAGES.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a name, adult dose, route, and indication", () => {
    for (const med of MEDICATION_DOSAGES) {
      expect(med.name.trim()).not.toBe("");
      expect(med.adultDose.trim()).not.toBe("");
      expect(med.route.trim()).not.toBe("");
      expect(med.indication.trim()).not.toBe("");
    }
  });

  it("preserves key doses from the source table", () => {
    const epi = MEDICATION_DOSAGES.find(m => m.id === "epinephrine");
    expect(epi?.adultDose).toContain("0.3 mg");
    const naloxone = MEDICATION_DOSAGES.find(m => m.id === "naloxone");
    expect(naloxone?.adultDose).toContain("2 mg");
  });
});
