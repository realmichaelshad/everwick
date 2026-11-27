import { describe, expect, it } from "vitest";

import { withoutWidow } from "@/lib/typography";

const NB = " ";

describe("withoutWidow", () => {
  it("joins the last two words so a line never ends on one", () => {
    expect(withoutWidow("Your history is right where you left them.")).toBe(`Your history is right where you left${NB}them.`);
    expect(withoutWidow("All done for today")).toBe(`All done for${NB}today`);
  });

  it("brings short connecting words along with the tail", () => {
    expect(withoutWidow("Check in for 13 days in a row.")).toBe(`Check in for 13 days${NB}in${NB}a${NB}row.`);
    expect(withoutWidow("3 more for 7 in a row.")).toBe(`3 more for${NB}7${NB}in${NB}a${NB}row.`);
  });

  it("leaves very long tails and single words alone", () => {
    expect(withoutWidow("Hello")).toBe("Hello");
    expect(withoutWidow("Two words")).toBe(`Two${NB}words`);
    expect(withoutWidow("Use the extraordinarily-long-compound tail-words-that-never-fit")).toBe("Use the extraordinarily-long-compound tail-words-that-never-fit");
  });
});
