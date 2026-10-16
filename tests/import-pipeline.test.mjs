import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchProduct } from "../scripts/import-server.mjs";
import { specificationLinks } from "../scripts/vendor-profiles.mjs";

test("discovery follows specification tabs for the same product only", () => {
  const links = specificationLinks(
    '<a href="/Motherboard/QA/Specification">Specifications</a><a href="https://evil.test/spec">spec</a><a href="/Motherboard/QAX/spec">spec</a>',
    "https://vn.msi.com/Motherboard/QA",
  );
  assert.ok(links.includes("https://vn.msi.com/Motherboard/QA/Specification"));
  assert.ok(!links.some((url) => url.includes("evil.test")));
});

test("pipeline merges overview images and embedded JSON specs across discovered pages", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const spec = String(url).includes("Specification");
    return new Response(
      spec
        ? '<script type="application/json">{"specs":[{"label":"Chipset","value":"AMD B650"},{"label":"Socket","value":"AM5"}]}</script>'
        : '<h1>Board QA</h1><meta property="og:image" content="https://cdn.example.test/front.jpg"><a href="/Motherboard/QA/Specification">Specifications</a>',
      { headers: { "content-type": "text/html" } },
    );
  };
  try {
    const result = await fetchProduct(
      "https://vn.msi.com/Motherboard/QA",
      "Mainboard",
      { browser: false },
    );
    assert.ok(
      result.fields.some(
        (field) => field.key === "name" && field.value === "Board QA",
      ),
    );
    assert.ok(
      result.fields.some(
        (field) => field.key === "spec.Socket" && field.value === "AM5",
      ),
    );
    assert.equal(result.images.length, 1);
    assert.equal(result.completeness.found, 2);
    assert.ok(result.attempts.length <= 7);
  } finally {
    globalThis.fetch = previous;
  }
});
