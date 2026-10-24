import { describe, it, expect } from "vitest";
import { groupByHorizon, HORIZONS } from "../src/core/horizon";

describe("horizon view (R2)", () => {
  it("places each goal on its horizon and keeps unset goals separate", () => {
    const g = groupByHorizon([
      { id: "a", title: "Income", horizon: "one_year", why: "Stability" },
      { id: "b", title: "Walk", horizon: "today" },
      { id: "c", title: "No level yet" },
      { id: "d", title: "Odd", horizon: "decade" },
    ]);
    expect(g.byHorizon.one_year.map((x) => x.id)).toEqual(["a"]);
    expect(g.byHorizon.today.map((x) => x.id)).toEqual(["b"]);
    expect(g.unset.map((x) => x.id)).toEqual(["c", "d"]);
    expect(HORIZONS).toHaveLength(5);
  });
  it("empty horizons are empty arrays, not zero counts", () => {
    expect(groupByHorizon([]).byHorizon.month).toEqual([]);
  });
});
