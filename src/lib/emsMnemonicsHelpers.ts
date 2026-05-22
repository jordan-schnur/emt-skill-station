import type { MnemonicLetter } from "../types";
import { jaccardSimilarity } from "./drillHelpers";

type Grade = "again" | "hard" | "good" | "easy";

// Medical shorthands that are acceptable abbreviations for their expansions
const ABBREV_MAP: Record<string, string[]> = {
  meds: ["medications"],
  hx: ["history"],
  sx: ["signs", "symptoms"],
  px: ["pertinent", "past", "history"],
  rx: ["medications", "treatment"],
  dx: ["diagnosis"],
  tx: ["treatment"],
  fx: ["fracture"],
  bp: ["blood", "pressure"],
  hr: ["heart", "rate"],
  rr: ["respiratory", "rate"],
};

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
}

function expandAbbreviations(tokens: string[]): string[] {
  const expanded: string[] = [];
  for (const tok of tokens) {
    if (ABBREV_MAP[tok]) {
      expanded.push(...ABBREV_MAP[tok]);
    } else {
      expanded.push(tok);
    }
  }
  return expanded;
}

// Checks if userTokens are all a prefix-subset of expectedTokens
// e.g. ["meds"] vs ["medications"] — "meds" is a prefix of "medications"
function allTokensArePrefixMatch(userTokens: string[], expectedTokens: string[]): boolean {
  if (userTokens.length === 0) return false;
  return userTokens.every(ut =>
    expectedTokens.some(et => et.startsWith(ut) && ut.length >= Math.max(2, et.length * 0.55))
  );
}

// Overlap coefficient: what fraction of user tokens appear in expected
function overlapCoefficient(userTokens: string[], expectedTokens: string[]): number {
  if (userTokens.length === 0) return 0;
  const expSet = new Set(expectedTokens);
  const matched = userTokens.filter(t => expSet.has(t)).length;
  return matched / userTokens.length;
}

export function quizMatchesAnswer(userInput: string, expected: string): boolean {
  const trimmed = userInput.trim();
  if (!trimmed) return false;

  // Fast path: Jaccard on the raw strings
  if (jaccardSimilarity(trimmed, expected) >= 0.45) return true;

  const userTokens = tokenize(trimmed);
  const expTokens = tokenize(expected);

  // Expand known medical abbreviations and re-check Jaccard
  const expandedUser = expandAbbreviations(userTokens);
  if (jaccardSimilarity(expandedUser.join(" "), expTokens.join(" ")) >= 0.45) return true;

  // Prefix match: "meds" starts "medications" at ≥55% length
  if (allTokensArePrefixMatch(userTokens, expTokens)) return true;

  // High overlap: all user tokens are found in expected (keyword subset)
  if (overlapCoefficient(userTokens, expTokens) >= 1.0 && userTokens.length >= 1) return true;

  return false;
}

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
