import { describe, it, expect, beforeEach } from "vitest";
import { intake, horizonScreen } from "../src/ui/screens";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";

// Goal entry form (intake step 6): title, why, success, horizon. Saved through the same path as goal.title.
const fill = (id: string, value: string) => {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
  el.value = value;
};
const submit = () => {
  const form = document.querySelector("form")!;
  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};
const stepSix = () => {
  const root = intake("6");
  document.body.appendChild(root);
  return root;
};

describe("goal entry form (intake step 6)", () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem("tm:ui:lang", "en"); store.demo.clear(); store.real.clear(); prefs.horizonView = "stack"; document.body.innerHTML = '<div id="app"></div>'; grantConsent(consentKv, "2026-10-25T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "real"); });
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tm:ui:lang", "en");
    store.demo.clear();
    store.real.clear();
    prefs.horizonView = "stack";
    document.body.innerHTML = '<div id="app"></div>';
    grantConsent(consentKv, "2026-10-25T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "real");
  });

  it("shows title, why, success and horizon fields from the catalog", () => {
    const root = stepSix();
    for (const id of ["goal.title", "goal.why", "goal.success", "goal.horizon"]) {
      expect(root.querySelector(`[data-field='${id}']`), id).not.toBeNull();
    }
    // horizon is a choice with five options and starts unset
    const sel = document.getElementById("f-goal.horizon") as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value).filter(Boolean)).toEqual(["five_year", "one_year", "month", "week", "today"]);
    expect(sel.value).toBe("");
  });

  it("a saved goal with a horizon appears in that horizon section", () => {
    stepSix();
    fill("f-goal.title", "Steady income");
    fill("f-goal.why", "Family security");
    fill("f-goal.success", "At least one income each month");
    fill("f-goal.horizon", "one_year");
    submit();

    const saved = store.real.get("intake-goal")!;
    expect(saved.values["goal.title"]).toMatchObject({ state: "value", value: "Steady income" });
    expect(saved.values["goal.why"]).toMatchObject({ state: "value", value: "Family security" });
    expect(saved.values["goal.success"]).toMatchObject({ state: "value", value: "At least one income each month" });
    expect(saved.values["goal.horizon"]).toMatchObject({ state: "value", value: "one_year" });

    const view = horizonScreen();
    document.body.appendChild(view);
    expect(view.querySelector("[data-horizon='one_year'] [data-goal='intake-goal']")).not.toBeNull();
    expect(view.querySelector("[data-horizon='unset'] [data-goal='intake-goal']")).toBeNull();
  });

});

describe("TM-TST-021 goal form: blank horizon is unset, never 0", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tm:ui:lang", "en");
    store.demo.clear();
    store.real.clear();
    prefs.horizonView = "stack";
    document.body.innerHTML = '<div id="app"></div>';
    grantConsent(consentKv, "2026-10-25T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "real");
  });

  it("leaving horizon blank stores nothing (unset, not zero) and the goal lands in the unset section", () => {
    stepSix();
    fill("f-goal.title", "Walk daily");
    submit();

    const saved = store.real.get("intake-goal")!;
    expect(saved.values["goal.horizon"]).toBeUndefined();
    expect(saved.values["goal.title"]).toMatchObject({ state: "value" });

    const view = horizonScreen();
    document.body.appendChild(view);
    expect(view.querySelector("[data-horizon='unset'] [data-goal='intake-goal']")).not.toBeNull();
    for (const k of ["five_year", "one_year", "month", "week", "today"]) {
      expect(view.querySelector(`[data-horizon='${k}'] [data-goal]`)).toBeNull();
    }
  });
});
