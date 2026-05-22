import type { MnemonicLetter } from "../types";

type Grade = "again" | "hard" | "good" | "easy";

export function suggestGrade(correct: number, total: number): Grade {
  if (total === 0) return "again";
  const pct = correct / total;
  if (pct < 0.5) return "again";
  if (pct < 0.8) return "hard";
  if (pct < 1.0) return "good";
  return "easy";
}

export function getNonConnectorLetters(letters: MnemonicLetter[]): MnemonicLetter[] {
  return letters.filter(l => l.stand !== "(connector)");
}
