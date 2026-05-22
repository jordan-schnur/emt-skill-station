import { describe, it, expect } from "vitest";
import { BLS_MEDICATIONS } from "../../src/data/bls_medications";

const REQUIRED_IDS = [
  "oxygen",
  "aspirin",
  "nitroglycerin",
  "oral-glucose",
  "activated-charcoal",
  "epinephrine-auto-injector",
  "albuterol",
  "naloxone",
  "isopropyl-alcohol",
];

describe("BLS_MEDICATIONS data integrity", () => {
  it("exports an array", () => {
    expect(Array.isArray(BLS_MEDICATIONS)).toBe(true);
  });

  it("contains all 9 required medications", () => {
    const ids = BLS_MEDICATIONS.map((m) => m.id);
    for (const id of REQUIRED_IDS) {
      expect(ids).toContain(id);
    }
  });

  it("every medication has required string fields", () => {
    for (const med of BLS_MEDICATIONS) {
      expect(typeof med.id).toBe("string");
      expect(typeof med.name).toBe("string");
      expect(typeof med.category).toBe("string");
      expect(typeof med.mechanism).toBe("string");
      expect(typeof med.onset).toBe("string");
    }
  });

  it("every medication has non-empty arrays for indications and contraindications", () => {
    for (const med of BLS_MEDICATIONS) {
      expect(med.indications.length).toBeGreaterThan(0);
      expect(med.contraindications.length).toBeGreaterThan(0);
      expect(med.sideEffects.length).toBeGreaterThan(0);
      expect(med.clinicalPearls.length).toBeGreaterThan(0);
      expect(med.route.length).toBeGreaterThan(0);
    }
  });

  it("every medication has a valid dose with adult field", () => {
    for (const med of BLS_MEDICATIONS) {
      expect(typeof med.dose.adult).toBe("string");
      expect(med.dose.adult.length).toBeGreaterThan(0);
    }
  });

  it("every medication has at least 3 scenarios", () => {
    for (const med of BLS_MEDICATIONS) {
      expect(med.scenarios.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every scenario has required fields", () => {
    for (const med of BLS_MEDICATIONS) {
      for (const s of med.scenarios) {
        expect(typeof s.id).toBe("string");
        expect(typeof s.vignette).toBe("string");
        expect(typeof s.prompt).toBe("string");
        expect(["give-withhold", "pick-drug"]).toContain(s.format);
        expect(typeof s.answer).toBe("string");
        expect(typeof s.explanation).toBe("string");
        expect(Array.isArray(s.followUps)).toBe(true);
      }
    }
  });

  it("give-withhold scenarios have answer 'give' or 'withhold'", () => {
    for (const med of BLS_MEDICATIONS) {
      for (const s of med.scenarios) {
        if (s.format === "give-withhold") {
          expect(["give", "withhold"]).toContain(s.answer);
        }
      }
    }
  });

  it("every medication has at least one 'withhold' scenario", () => {
    for (const med of BLS_MEDICATIONS) {
      const hasWithhold = med.scenarios.some(
        (s) => s.format === "give-withhold" && s.answer === "withhold"
      );
      expect(hasWithhold).toBe(true);
    }
  });

  it("followUp options always has exactly 4 choices", () => {
    for (const med of BLS_MEDICATIONS) {
      for (const s of med.scenarios) {
        for (const fu of s.followUps) {
          expect(fu.options.length).toBe(4);
          expect(fu.options).toContain(fu.answer);
          expect(["dose", "route", "contraindication-check", "reassessment"]).toContain(fu.type);
          expect(typeof fu.question).toBe("string");
          expect(fu.question.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("scenario IDs are unique across all medications", () => {
    const ids: string[] = [];
    for (const med of BLS_MEDICATIONS) {
      for (const s of med.scenarios) {
        ids.push(s.id);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
