import { describe, it, expect } from "vitest";
import { suggestGrade, getNonConnectorLetters, quizMatchesAnswer } from "../../src/lib/emsMnemonicsHelpers";
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

describe("quizMatchesAnswer", () => {
  // Exact and near-exact matches
  it("accepts exact match", () => {
    expect(quizMatchesAnswer("Medications", "Medications")).toBe(true);
  });

  it("accepts case-insensitive match", () => {
    expect(quizMatchesAnswer("medications", "Medications")).toBe(true);
  });

  it("accepts close Jaccard match", () => {
    expect(quizMatchesAnswer("Signs Symptoms", "Signs and Symptoms")).toBe(true);
  });

  // Medical abbreviation prefix matches
  it("accepts 'meds' for 'Medications'", () => {
    expect(quizMatchesAnswer("meds", "Medications")).toBe(true);
  });

  it("accepts 'hx' for 'History'", () => {
    expect(quizMatchesAnswer("hx", "History")).toBe(true);
  });

  it("accepts 'sx' for 'Signs and Symptoms'", () => {
    expect(quizMatchesAnswer("sx", "Signs and Symptoms")).toBe(true);
  });

  it("accepts 'px' for 'Pertinent past history'", () => {
    expect(quizMatchesAnswer("px", "Pertinent past history")).toBe(true);
  });

  // Subset / keyword matches
  it("accepts single keyword that matches first word", () => {
    expect(quizMatchesAnswer("signs", "Signs and Symptoms")).toBe(true);
  });

  it("accepts 'allergies' for 'Allergies'", () => {
    expect(quizMatchesAnswer("allergies", "Allergies")).toBe(true);
  });

  it("accepts 'pertinent' for 'Pertinent past history'", () => {
    expect(quizMatchesAnswer("pertinent", "Pertinent past history")).toBe(true);
  });

  // Misspellings (edit-distance tolerance)
  it("accepts 'simtoms' for 'Signs and Symptoms'", () => {
    expect(quizMatchesAnswer("simtoms", "Signs and Symptoms")).toBe(true);
  });

  it("accepts 'symptons' for 'Signs and Symptoms'", () => {
    expect(quizMatchesAnswer("symptons", "Signs and Symptoms")).toBe(true);
  });

  it("accepts 'alergies' for 'Allergies'", () => {
    expect(quizMatchesAnswer("alergies", "Allergies")).toBe(true);
  });

  it("accepts 'medicatons' for 'Medications'", () => {
    expect(quizMatchesAnswer("medicatons", "Medications")).toBe(true);
  });

  it("accepts 'histroy' for 'History'", () => {
    expect(quizMatchesAnswer("histroy", "History")).toBe(true);
  });

  // Should still reject clearly wrong answers
  it("rejects completely unrelated answer", () => {
    expect(quizMatchesAnswer("banana", "Medications")).toBe(false);
  });

  it("rejects empty answer", () => {
    expect(quizMatchesAnswer("", "Medications")).toBe(false);
  });

  it("rejects short nonsense prefix", () => {
    expect(quizMatchesAnswer("xyz", "Medications")).toBe(false);
  });
});
