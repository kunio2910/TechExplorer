import test from "node:test";
import assert from "node:assert/strict";
import {
  archive,
  unarchive,
  filterDevices,
  moveImage,
  publishChecks,
} from "../lib/catalog-tools";
import { seedCatalogComponents, seedProducts } from "../lib/seed";
import { normalizeSpecValue, specMatches } from "../lib/spec-units";
import { candidateCompatibility, newBuild } from "../lib/pc-build";
test("trash preserves data and restores as a draft", () => {
  const item = archive(seedProducts[0], "admin");
  assert.equal(item.status, "draft");
  assert.ok(item.deletedAt);
  assert.deepEqual(item.hotspots, seedProducts[0].hotspots);
  const restored = unarchive(item, "admin");
  assert.equal(restored.deletedAt, undefined);
  assert.equal(restored.status, "draft");
  assert.equal(restored.history?.length, 2);
  assert.equal(seedProducts[0].deletedAt, undefined);
});
test("filters combine brand and socket, reordering preserves every image", () => {
  assert.equal(
    filterDevices(seedProducts, { brand: "ASUS", Socket: "AM5" }).length,
    1,
  );
  assert.equal(filterDevices(seedProducts, { Socket: "AM4" }).length, 0);
  assert.deepEqual(moveImage(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
});
test("publication refuses missing images and duplicate slugs", () => {
  assert.ok(publishChecks(seedProducts[0], seedProducts).every((c) => c.valid));
  const copy = { ...seedProducts[0], id: "copy" };
  assert.ok(publishChecks(copy, seedProducts).some((c) => !c.valid));
  assert.ok(
    publishChecks({ ...copy, slug: "new", media: {} }, []).some(
      (c) => !c.valid,
    ),
  );
});
test("normalizes equivalent memory and SSD labels for filters and builder choices", () => {
  assert.equal(normalizeSpecValue("Memory type", "DDR5 UDIMM"), "DDR5");
  assert.equal(specMatches("Memory type", "DDR5UDIMM", "DDR5"), true);
  assert.equal(specMatches("SSD type", "M2-NVMe, SATA", "M.2 NVMe"), true);
  const build = newBuild();
  const board = seedProducts[0];
  const cpu = seedCatalogComponents.find((item) => item.type === "CPU");
  assert.ok(cpu);
  assert.equal(
    candidateCompatibility("CPU", cpu, { ...build, parts: { Mainboard: board.id } }, [board, cpu]).ok,
    true,
  );
});
