import test from "node:test";
import assert from "node:assert/strict";
import { officialUrl, detectSource, extractProduct } from "./extract.js";
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
test("recognizes common vendor product lines from official URLs", () => {
  assert.deepEqual(
    (({ brand, detectedLine, parser }) => ({ brand, detectedLine, parser }))(
      detectSource("https://rog.asus.com/motherboards/rog-maximus/x/spec/"),
    ),
    { brand: "ASUS", detectedLine: "ROG", parser: "asus-rog" },
  );
  assert.equal(
    detectSource("https://www.msi.com/Motherboard/MAG-TOMAHAWK").detectedLine,
    "MAG",
  );
  assert.equal(
    detectSource("https://www.gigabyte.com/Motherboard/X870E-AORUS").detectedLine,
    "AORUS",
  );
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

test("ASUS-style section headings are mapped to mainboard fields", () => {
  const html = `<h1>ROG MAXIMUS Z890 HERO BTF</h1>
    <h2>CPU</h2><p>Support Intel Core Ultra Processors, LGA1851</p>
    <h2>Chipset</h2><p>Intel Z890 Chipset</p>
    <h2>Memory</h2><p>4 x DIMM slots, max. 256GB, DDR5</p>
    <h2>Storage</h2><p>Supports up to 6 x M.2 slots with PCIe mode and 4 x SATA 6Gb/s ports</p>
    <h2>Form Factor</h2><p>ATX Form Factor</p>`;
  const result = extractProduct(
    html,
    "https://rog.asus.com/motherboards/rog-maximus/rog-maximus-z890-hero-btf/spec/",
    "Mainboard",
  );
  const fields = Object.fromEntries(
    result.fields.map((field) => [field.key, field.value]),
  );
  assert.equal(fields["spec.Socket"], "LGA1851");
  assert.equal(fields["spec.Chipset"], "Intel Z890 Chipset");
  assert.equal(fields["spec.Memory type"], "DDR5");
  assert.equal(fields["spec.Max memory"], "256GB");
  assert.equal(fields["spec.Memory slots"], "4 x DIMM slots");
  assert.equal(fields["spec.M.2 slots"], "6 x M.2 slots");
  assert.equal(fields["spec.SATA"], "4 x SATA 6Gb/s ports");
  assert.equal(fields["spec.SSD type"], "M.2 NVMe, SATA");
  assert.match(fields["spec.Form factor"], /ATX/);
});

test("vendor-neutral heading aliases map non-ASUS mainboard pages", () => {
  const result = extractProduct(
    `<h1>MAG BOARD</h1><h3>Processor</h3><div>AMD AM5 Socket</div>
      <h3>Memory Support</h3><div>4 x DIMM, DDR5, max 128GB</div>
      <h3>Storage Support</h3><div>2 x M.2 slots, 4 x SATA ports</div>`,
    "https://www.msi.com/Motherboard/MAG-BOARD/specification",
    "Mainboard",
  );
  const fields = Object.fromEntries(result.fields.map((field) => [field.key, field.value]));
  assert.equal(fields["spec.Socket"], "AM5");
  assert.equal(fields["spec.Memory type"], "DDR5");
  assert.equal(fields["spec.M.2 slots"], "2 x M.2 slots");
  assert.equal(result.detectedLine, "MAG");
});
