import { describe, expect, it } from "vitest";
import { humanise, money, needsHuman, sampleLabel } from "./format";

describe("format helpers", () => {
  it("humanises reason codes", () => {
    expect(humanise("BANK_DETAILS_CHANGED")).toBe("Bank Details Changed");
  });

  it("labels sample files", () => {
    expect(sampleLabel("inv_b_price_variance")).toBe("B · Price Variance");
    expect(sampleLabel("other")).toBe("other");
  });

  it("formats money", () => {
    expect(money(1550)).toContain("1,550.00");
  });

  it("knows which cases need a human", () => {
    expect(needsHuman("HOLD", "OPEN")).toBe(true);
    expect(needsHuman("ROUTE_TO_HUMAN", "CLOSED")).toBe(false);
    expect(needsHuman("REJECT", "OPEN")).toBe(false);
  });
});
