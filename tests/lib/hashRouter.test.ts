import { describe, it, expect, beforeEach } from "vitest";
import { parseHash, writeHash } from "../../src/router/hashRouter";

describe("parseHash — mnemonics single-card quiz", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("parses #mnemonics/quiz/<id> into mnemonicsCardId", () => {
    window.location.hash = "#mnemonics/quiz/sample";
    const route = parseHash();
    expect(route).toMatchObject({
      view: "mnemonics",
      mnemonicsTab: "quiz",
      mnemonicsCardId: "sample",
    });
  });

  it("parses #mnemonics/quiz (no id) without mnemonicsCardId", () => {
    window.location.hash = "#mnemonics/quiz";
    const route = parseHash();
    expect(route).toMatchObject({ view: "mnemonics", mnemonicsTab: "quiz" });
    expect(route?.mnemonicsCardId).toBeUndefined();
  });

  it("parses #mnemonics (browse) without mnemonicsCardId", () => {
    window.location.hash = "#mnemonics";
    const route = parseHash();
    expect(route).toMatchObject({ view: "mnemonics", mnemonicsTab: "browse" });
    expect(route?.mnemonicsCardId).toBeUndefined();
  });
});

describe("writeHash — mnemonics single-card quiz", () => {
  it("emits mnemonics/quiz/<id> when mnemonicsCardId is set", () => {
    const calls: string[] = [];
    const orig = window.history.replaceState.bind(window.history);
    window.history.replaceState = (_: unknown, __: string, url: string) => {
      calls.push(url);
      orig(_, __, url);
    };
    writeHash({ view: "mnemonics", mnemonicsTab: "quiz", mnemonicsCardId: "hs-and-ts" });
    expect(calls.at(-1)).toBe("#mnemonics/quiz/hs-and-ts");
    window.history.replaceState = orig;
  });

  it("emits mnemonics/quiz (no id) when mnemonicsCardId is absent", () => {
    const calls: string[] = [];
    const orig = window.history.replaceState.bind(window.history);
    window.history.replaceState = (_: unknown, __: string, url: string) => {
      calls.push(url);
      orig(_, __, url);
    };
    writeHash({ view: "mnemonics", mnemonicsTab: "quiz" });
    expect(calls.at(-1)).toBe("#mnemonics/quiz");
    window.history.replaceState = orig;
  });
});
