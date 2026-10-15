import test from "node:test";
import assert from "node:assert/strict";
import { officialUrl, extractProduct } from "./extract.js";
test("only official HTTPS sources and safe redirects are accepted", () => {
  for (const url of [
    "http://asus.com/a",
    "https://asus.com.evil.test/",
    "https://localhost/",
    "https://user@asus.com/",
    "https://asus.com:8443/",
  ])
    assert.throws(() => officialUrl(url));
  assert.equal(officialUrl("https://rog.asus.com/boards/").brand, "ASUS");
});
test("structured product and table specs are extracted without inventing missing values", () => {
  const html = `<script type="application/ld+json">{"@type":"Product","name":"Board QA","image":["/a.jpg"],"additionalProperty":[{"name":"Socket","value":"AM5"}]}</script><table><tr><th>Memory type</th><td>DDR5</td></tr><tr><th>M.2 slots</th><td>2</td></tr></table>`;
  const value = extractProduct(html, "https://www.asus.com/qa/", "Mainboard");
  assert.equal(value.fields.find((f) => f.key === "spec.Socket").value, "AM5");
  assert.equal(
    value.fields.find((f) => f.key === "spec.Memory type").value,
    "DDR5",
  );
  assert.ok(value.missing.includes("SSD type"));
  assert.deepEqual(value.images, ["https://www.asus.com/a.jpg"]);
});
test("all six types accept labelled specs; malformed JSON falls back to metadata", () => {
  const entries = {
    CPU: ["Total cores", "Cores"],
    RAM: ["Capacity", "Capacity"],
    SSD: ["Read speed", "Read speed"],
    GPU: ["Memory size", "VRAM"],
    PSU: ["Wattage", "Wattage"],
  };
  for (const [type, [name, key]] of Object.entries(entries)) {
    const data = extractProduct(
      `<script type="application/ld+json">broken</script><meta property="og:title" content="QA"><dl><dt>${name}</dt><dd>16</dd></dl>`,
      "https://www.asus.com/qa",
      type,
    );
    assert.equal(data.fields.find((f) => f.key === `spec.${key}`).value, "16");
    assert.equal(data.fields.find((f) => f.key === "name").value, "QA");
  }
});
