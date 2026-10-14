import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSpecValue, specNumber } from "../lib/spec-units";
import { checkBuild, validateBuild, type PcBuild } from "../lib/pc-build";
import { linkedProduct } from "../lib/linked-components";
import { explorerUrl, parseExplorerState } from "../lib/explorer-state";
import { seedProducts } from "../lib/seed";
import type { CatalogComponent } from "../lib/types";
const ram: CatalogComponent = {
  id: "ram",
  type: "RAM",
  category: "RAM",
  name: "RAM mới",
  model: "Model mới",
  brand: "QA",
  description: "RAM",
  spec: { Capacity: "32gb", "Memory type": "ddr5", Modules: "2" },
  status: "published",
  compatibility: "warning",
  notes: "",
};
test("normalization handles quantities and preserves bit rates, descriptions and unknown values", () => {
  for (const input of ["32GB", "32 GB", "32gb", "32"])
    assert.equal(normalizeSpecValue("Capacity", input), "32 GB");
  assert.equal(normalizeSpecValue("Boost clock", "5,4ghz"), "5.4 GHz");
  assert.equal(normalizeSpecValue("LAN", "2.5Gb Ethernet"), "2.5Gb Ethernet");
  assert.equal(
    normalizeSpecValue("Capacity", "32 GB (2 × 16 GB)"),
    "32 GB (2 × 16 GB)",
  );
  assert.equal(specNumber("Capacity", "2tb", "GB"), 2000);
  assert.equal(specNumber("TDP", "Không rõ", "W"), undefined);
});
test("references follow library updates and hide unavailable linked components", () => {
  const product = {
    ...seedProducts[0],
    components: [{ ...seedProducts[0].components[0], catalogId: "ram" }],
  };
  assert.equal(linkedProduct(product, [ram]).components[0].name, "RAM mới");
  assert.equal(
    linkedProduct(product, [{ ...ram, name: "Đã đổi tên" }]).components[0].name,
    "Đã đổi tên",
  );
  assert.equal(
    linkedProduct(product, [{ ...ram, status: "draft" }]).components.length,
    0,
  );
  assert.equal(linkedProduct(product, []).components.length, 0);
});
test("builder refuses excess capacity and socket mismatches and does not certify unknown specs", () => {
  const board = {
    ...seedProducts[0],
    spec: { ...seedProducts[0].spec, "Max memory": "32GB" },
  };
  const build: PcBuild = {
    id: "test",
    name: "Test",
    parts: { Mainboard: board.id, RAM: ram.id },
    ramKits: 2,
    drives: 1,
  };
  const checks = checkBuild(build, [board, ram]);
  assert.equal(
    checks.find((x) => x.title === "Dung lượng RAM")?.status,
    "incompatible",
  );
  assert.equal(
    checks.find((x) => x.title === "Chuẩn bộ nhớ RAM")?.status,
    "compatible",
  );
  assert.equal(checks.find((x) => x.title === "Nguồn điện")?.status, "warning");
  assert.ok(checks.some((x) => x.title === "CPU" && x.status === "warning"));
  assert.equal(
    checkBuild({ ...build, ramKits: 1 }, [board, ram]).find(
      (x) => x.title === "Dung lượng RAM",
    )?.status,
    "compatible",
  );
});
test("shared configurations reject malformed fields and quantities", () => {
  const build = {
    id: "id",
    name: "Máy cá nhân",
    parts: { RAM: "ram" },
    ramKits: 1,
    drives: 1,
  };
  assert.deepEqual(validateBuild(JSON.parse(JSON.stringify(build))), build);
  assert.throws(() => validateBuild({ ...build, ramKits: -1 }));
  assert.throws(() => validateBuild({ ...build, parts: { Unknown: "id" } }));
  assert.throws(() => validateBuild({ ...build, parts: ["id"] }));
});
test("share links restore component or mainboard tab, hotspot and view without choosing a default", () => {
  const state = {
    screen: "explorer" as const,
    device: "board",
    category: "Mainboard",
    tab: "Specifications",
    hotspot: "cpu",
    view: "signal",
    query: "b850",
  };
  assert.deepEqual(
    parseExplorerState(
      new URL(explorerUrl(state, "/TechExplorer"), "https://example.test"),
    ),
    { ...state, component: undefined, filters: {} },
  );
  assert.equal(
    parseExplorerState(new URL("https://example.test/TechExplorer/")).screen,
    "home",
  );
  const component = parseExplorerState(
    new URL(
      "https://example.test/?screen=components&component=ram&category=RAM&tab=Specifications",
    ),
  );
  assert.equal(component.component, "ram");
  assert.equal(component.tab, "Specifications");
  assert.equal(component.device, undefined);
});
