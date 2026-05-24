import { describe, it, expect } from "vitest";
import { reviewsLast14Days } from "../../src/lib/activity";

describe("reviewsLast14Days", () => {
  it("returns exactly 14 entries", () => {
    expect(reviewsLast14Days(undefined)).toHaveLength(14);
  });

  it("zero-fills missing days", () => {
    expect(reviewsLast14Days({}).every((n) => n === 0)).toBe(true);
  });

  it("places today count at index 13", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = reviewsLast14Days({ [today]: 7 });
    expect(result[13]).toBe(7);
  });

  it("places 13-days-ago count at index 0", () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 13);
    const dateStr = d.toISOString().slice(0, 10);
    const result = reviewsLast14Days({ [dateStr]: 3 });
    expect(result[0]).toBe(3);
  });

  it("handles undefined log gracefully", () => {
    expect(() => reviewsLast14Days(undefined)).not.toThrow();
  });
});
