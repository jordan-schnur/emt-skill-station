import { describe, it, expect } from "vitest";
import { suggestGrade, getNonConnectorLetters } from "../../src/lib/emsMnemonicsHelpers";
import type { MnemonicLetter } from "../../src/types";

describe("suggestGrade", () => {
  it("suggests again for 0% correct", () => {
    expect(suggestGrade(0, 4)).toBe("again");
  });

  it("suggests again for less than 50% correct", () => {
    expect(suggestGrade(1, 4)).toBe("again"); // 25%
  });

  it("suggests hard for exactly 50% correct", () => {
    expect(suggestGrade(2, 4)).toBe("hard"); // 50%
  });

  it("suggests hard for 50–79% correct", () => {
    expect(suggestGrade(3, 4)).toBe("hard"); // 75%
  });

  it("suggests good for exactly 80% correct", () => {
    expect(suggestGrade(4, 5)).toBe("good"); // 80%
  });

  it("suggests good for 80–99% correct", () => {
    expect(suggestGrade(5, 6)).toBe("good"); // ~83%
  });

  it("suggests easy for 100% correct", () => {
    expect(suggestGrade(4, 4)).toBe("easy");
  });

  it("suggests easy for 6/6 correct", () => {
    expect(suggestGrade(6, 6)).toBe("easy");
  });
});

describe("getNonConnectorLetters", () => {
  it("excludes letters where stand is (connector)", () => {
    const letters: MnemonicLetter[] = [
      { letter: "P", stand: "Pupils", detail: "desc" },
      { letter: "E", stand: "Equal", detail: "desc" },
      { letter: "A", stand: "(connector)", detail: "(connector)" },
      { letter: "R", stand: "Reactive", detail: "desc" },
      { letter: "L", stand: "to Light", detail: "desc" },
    ];
    const result = getNonConnectorLetters(letters);
    expect(result).toHaveLength(4);
    expect(result.map(l => l.letter)).toEqual(["P", "E", "R", "L"]);
  });

  it("returns all letters when none are connectors", () => {
    const letters: MnemonicLetter[] = [
      { letter: "S", stand: "Signs and Symptoms", detail: "desc" },
      { letter: "A", stand: "Allergies", detail: "desc" },
    ];
    expect(getNonConnectorLetters(letters)).toHaveLength(2);
  });

  it("returns empty array when all letters are connectors", () => {
    const letters: MnemonicLetter[] = [
      { letter: "A", stand: "(connector)", detail: "(connector)" },
    ];
    expect(getNonConnectorLetters(letters)).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(getNonConnectorLetters([])).toHaveLength(0);
  });
});
