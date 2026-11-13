import { beforeEach, expect, it } from "vitest";
import { inputFor } from "../src/ui/fieldInput";
import { fieldById } from "../src/catalog/fields";
import type { FieldValue } from "../src/core/types";
const value = (value: unknown): FieldValue => ({ state: "value", value, label: "DEMO" });
beforeEach(() => document.body.replaceChildren());
it("catalog multichoice saves two independent choices as a list and reopens them", () => {
  const field = fieldById("habit.days")!;
  const edit = inputFor(field, "en", undefined); document.body.append(edit.el);
  edit.el.querySelector<HTMLInputElement>('[data-multi-option="1"]')!.click();
  edit.el.querySelector<HTMLInputElement>('[data-multi-option="3"]')!.click();
  const saved = edit.read(); expect(saved).toEqual(value(["1", "3"]));
  const reopened = inputFor(field, "bn", saved as FieldValue);
  expect([...reopened.el.querySelectorAll<HTMLInputElement>('input:checked')].map(c => c.value)).toEqual(["1", "3"]);
  expect(reopened.el.querySelector("legend")!.textContent).toBe(field.label.bn);
  expect(reopened.el.querySelector('select:not([data-role=state])')).toBeNull();
});
it("legacy comma-separated habit days and removed saved codes survive a roundtrip", () => {
  const edit = inputFor(fieldById("habit.days")!, "en", value("1,3"));
  expect(edit.read()).toEqual(value(["1", "3"]));
  const extra = inputFor(fieldById("habit.days")!, "en", value(["1", "legacy-code"]));
  expect(extra.read()).toEqual(value(["1", "legacy-code"]));
});
it("clear overwrites an existing list as Unknown and explicit unknown states win over checked choices", () => {
  const edit = inputFor(fieldById("habit.days")!, "en", value(["1", "3"])); document.body.append(edit.el);
  edit.el.querySelectorAll<HTMLInputElement>('input:checked').forEach(check => check.click());
  expect(edit.read()).toEqual({ state: "unknown" });
  expect(inputFor(fieldById("habit.days")!, "en", undefined).read()).toBeNull();
  const unknown = inputFor(fieldById("habit.days")!, "en", { state: "prefer_not" });
  unknown.el.querySelector<HTMLInputElement>('input')!.checked = true;
  expect(unknown.read()).toEqual({ state: "prefer_not" });
});
it("list editor preserves separate entries, reopens them, and clearing saves Unknown", () => {
  const field = fieldById("goal.swot_strengths")!;
  const edit = inputFor(field, "en", value(["Sales", "Repair"])); const area = edit.el.querySelector("textarea")!;
  expect(area.value).toBe("Sales\nRepair"); area.value = "Sales\nRepair\nNew skill\n";
  expect(edit.read()).toEqual(value(["Sales", "Repair", "New skill"]));
  expect(inputFor(field, "en", edit.read() as FieldValue).el.querySelector("textarea")!.value).toBe("Sales\nRepair\nNew skill");
  area.value = ""; expect(edit.read()).toEqual({ state: "unknown" });
});
it("list editor still rejects secret-looking items", () => {
  const edit = inputFor(fieldById("goal.swot_strengths")!, "en", undefined);
  edit.el.querySelector("textarea")!.value = "OTP 123456";
  expect(edit.read()).toBe("secret");
});
it("scalar choice and numbers retain their original types and Unknown behavior", () => {
  const choice = inputFor(fieldById("task.priority")!, "en", value("high"));
  expect(choice.read()).toEqual(value("high"));
  const money = inputFor(fieldById("finance.amount")!, "bn", undefined);
  const input = money.el.querySelector("input")!; input.value = "১,২০০";
  expect(money.read()).toEqual(value(1200));
  input.value = "invalid"; expect(money.read()).toBe("invalid");
  input.value = ""; expect(money.read()).toBeNull();
});
