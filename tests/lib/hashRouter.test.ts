import { describe, it, expect, beforeEach } from "vitest";
import { parseHash, writeHash } from "../../src/router/hashRouter";

describe("parseHash — mnemonics single-card quiz (legacy redirects)", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("redirects #mnemonics/quiz/<id> to reference/mnemonics with cardId", () => {
    window.location.hash = "#mnemonics/quiz/sample";
    const route = parseHash();
    expect(route).toMatchObject({
      view: "reference",
      referenceTab: "mnemonics",
      referenceCardId: "sample",
    });
  });

  it("redirects #mnemonics/quiz (no id) to reference/mnemonics", () => {
    window.location.hash = "#mnemonics/quiz";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "mnemonics" });
    expect(route?.referenceCardId).toBeUndefined();
  });

  it("redirects #mnemonics (browse) to reference/mnemonics", () => {
    window.location.hash = "#mnemonics";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "mnemonics" });
  });
});

describe("writeHash — mnemonics single-card quiz (legacy)", () => {
  it("emits reference/mnemonics/quiz/<id> when referenceCardId is set", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => {
      calls.push(url);
      orig(_, __, url);
    };
    writeHash({ view: "reference", referenceTab: "mnemonics", referenceCardId: "hs-and-ts" });
    expect(calls.at(-1)).toContain("/reference/mnemonics/quiz/hs-and-ts");
    window.history.pushState = orig;
  });

  it("emits reference/mnemonics when referenceCardId is absent", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => {
      calls.push(url);
      orig(_, __, url);
    };
    writeHash({ view: "reference", referenceTab: "mnemonics" });
    expect(calls.at(-1)).toContain("/reference/mnemonics");
    window.history.pushState = orig;
  });
});

describe("router — reference route", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("parses /reference with no tab as conditions", () => {
    window.location.hash = "#reference";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "conditions" });
  });

  it("parses /reference/mnemonics", () => {
    window.location.hash = "#reference/mnemonics";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "mnemonics" });
  });

  it("parses /reference/meds", () => {
    window.location.hash = "#reference/meds";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "meds" });
  });

  it("parses /reference/mnemonics/quiz/<id>", () => {
    window.location.hash = "#reference/mnemonics/quiz/opqrst";
    const route = parseHash();
    expect(route).toMatchObject({
      view: "reference",
      referenceTab: "mnemonics",
      referenceCardId: "opqrst",
    });
  });

  it("redirects old /mnemonics to reference/mnemonics", () => {
    window.location.hash = "#mnemonics";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "mnemonics" });
  });

  it("redirects old /medconditions to reference/conditions", () => {
    window.location.hash = "#medconditions";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "conditions" });
  });

  it("redirects old /blsmeds to reference/meds", () => {
    window.location.hash = "#blsmeds";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "meds" });
  });
});

describe("writePath — reference route", () => {
  it("writes /reference/conditions for conditions tab", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => { calls.push(url); orig(_, __, url); };
    writeHash({ view: "reference", referenceTab: "conditions" });
    expect(calls.at(-1)).toContain("/reference/conditions");
    window.history.pushState = orig;
  });

  it("writes /reference/mnemonics for mnemonics tab", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => { calls.push(url); orig(_, __, url); };
    writeHash({ view: "reference", referenceTab: "mnemonics" });
    expect(calls.at(-1)).toContain("/reference/mnemonics");
    window.history.pushState = orig;
  });

  it("writes /reference/mnemonics/quiz/<id> when referenceCardId set", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => { calls.push(url); orig(_, __, url); };
    writeHash({ view: "reference", referenceTab: "mnemonics", referenceCardId: "opqrst" });
    expect(calls.at(-1)).toContain("/reference/mnemonics/quiz/opqrst");
    window.history.pushState = orig;
  });

  it("writes /reference/meds for meds tab", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => { calls.push(url); orig(_, __, url); };
    writeHash({ view: "reference", referenceTab: "meds" });
    expect(calls.at(-1)).toContain("/reference/meds");
    window.history.pushState = orig;
  });
});
