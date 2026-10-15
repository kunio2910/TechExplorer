import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProductFile } from "../lib/product-import";

test("imports nested specs, numeric values, safe images and source", () => {
  const p = parseProductFile(
    JSON.stringify({
      type: "RAM",
      name: "RAM QA",
      spec: { Capacity: 32 },
      images: ["javascript:alert(1)", "https://example.com/ram.png"],
      sourceUrl: "javascript:alert(1)",
    }),
    "ram.json",
    "RAM",
  );
  assert.deepEqual(p.fields, [
    { key: "name", value: "RAM QA" },
    { key: "spec.Capacity", value: "32" },
  ]);
  assert.equal(p.images.length, 1);
  assert.equal(p.sourceUrl, "");
});
test("CSV handles BOM, multiline quoted descriptions and escaped quotes", () => {
  const p = parseProductFile(
    '\uFEFFtype,name,description,spec.Capacity\r\nRAM,"RAM, QA","Dong 1\nDong ""2""",32gb',
    "ram.csv",
    "RAM",
  );
  assert.equal(
    p.fields.find((f) => f.key === "description")?.value,
    'Dong 1\nDong "2"',
  );
  assert.equal(p.fields.find((f) => f.key === "spec.Capacity")?.value, "32gb");
});
test("rejects mismatched types, oversized and malformed files", () => {
  for (const [body, file] of [
    ['{"type":"CPU","name":"CPU"}', "p.json"],
    ["name\na\nb", "p.csv"],
    ["name,name\na,b", "p.csv"],
    ['name\n"oops', "p.csv"],
    ["[]", "p.json"],
    ["x".repeat(2_000_001), "p.json"],
  ])
    assert.throws(() => parseProductFile(body, file, "RAM"));
});
test("accepts local extractor output and blocks object mutation keys", () => {
  const p = parseProductFile(
    JSON.stringify({
      type: "CPU",
      fields: [
        { key: "name", value: "CPU QA" },
        { key: "id", value: "overwrite" },
        { key: "spec.__proto__", value: "bad" },
      ],
    }),
    "cpu.json",
    "CPU",
  );
  assert.deepEqual(p.fields, [{ key: "name", value: "CPU QA" }]);
});
