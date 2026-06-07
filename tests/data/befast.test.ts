import { describe, it, expect } from "vitest";
import { EMS_CLINICAL_MNEMONICS } from "../../src/data/ems_clinical_mnemonics";

const befast = EMS_CLINICAL_MNEMONICS.find(m => m.id === "befast");

describe("BE-FAST stroke assessment mnemonic", () => {
  it("exists in the EMS clinical mnemonics", () => {
    expect(befast).toBeDefined();
    expect(befast?.acronym).toBe("BE-FAST");
    expect(befast?.category).toBe("Stroke");
  });

  it("spells out Balance, Eyes, Face, Arm, Speech, Time in order", () => {
    expect(befast?.letters.map(l => l.letter)).toEqual(["B", "E", "F", "A", "S", "T"]);
    const stands = befast?.letters.map(l => l.stand.toLowerCase()) ?? [];
    expect(stands[0]).toContain("balance");
    expect(stands[1]).toContain("eyes");
    expect(stands[2]).toContain("face");
    expect(stands[3]).toContain("arm");
    expect(stands[4]).toContain("speech");
    expect(stands[5]).toContain("time");
  });

  it("gives a teaching detail for every letter", () => {
    for (const l of befast?.letters ?? []) {
      expect(l.detail?.trim()).toBeTruthy();
    }
  });

  it("cites the American Stroke Association as an authoritative source", () => {
    const sources = befast?.sources ?? [];
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.some(s => /American Stroke Association/i.test(s))).toBe(true);
    expect(sources.some(s => s.includes("stroke.org"))).toBe(true);
  });
});
