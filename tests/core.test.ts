import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCompatibility } from "../lib/compatibility";
import { validateProduct } from "../lib/validation";
import { seedProducts } from "../lib/seed";
import { authorized } from "../lib/auth";
import { componentGallery, productGallery } from "../lib/gallery";
const seed = seedProducts[0];
test("AM5 DDR5 pass and mismatched sockets/types fail", () => {
  assert.deepEqual(
    evaluateCompatibility(seed.spec, "AM5", "DDR5").map((r) => r.status),
    ["compatible", "compatible", "warning"],
  );
  assert.deepEqual(
    evaluateCompatibility(seed.spec, "AM4", "DDR4").map((r) => r.status),
    ["incompatible", "incompatible", "warning"],
  );
});
test("publishing requires image, metadata and five hotspots", () => {
  assert.equal(validateProduct(seed).id, seed.id);
  assert.throws(() => validateProduct({ ...seed, hotspots: [] }));
  assert.throws(() => validateProduct({ ...seed, media: {} }));
  assert.throws(() =>
    validateProduct({
      ...seed,
      hotspots: seed.hotspots.map((h) => ({ ...h, x: 101 })),
    }),
  );
  assert.throws(() => validateProduct({ ...seed, slug: "../bad" }));
  assert.throws(() =>
    validateProduct({ ...seed, media: { top: "javascript:alert(1)" } }),
  );
});
test("associated components keep their compatibility metadata", () => {
  assert.equal(seed.components.length, 3);
  assert.equal(validateProduct(seed).components[0].compatibility, "compatible");
  assert.throws(() =>
    validateProduct({
      ...seed,
      components: [{ ...seed.components[0], compatibility: "unknown" }],
    }),
  );
});
test("writes cannot authenticate without a configured secret", () => {
  const old = process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN;
  assert.equal(authorized(new Request("http://localhost")), false);
  process.env.ADMIN_TOKEN = "secret";
  assert.equal(
    authorized(
      new Request("http://localhost", {
        headers: { Authorization: "Bearer secret" },
      }),
    ),
    true,
  );
  assert.equal(
    authorized(
      new Request("http://localhost", {
        headers: { Authorization: "Bearer nope" },
      }),
    ),
    false,
  );
  if (old) process.env.ADMIN_TOKEN = old;
  else delete process.env.ADMIN_TOKEN;
});
test("image galleries deduplicate the main image and ignore empty URLs", () => {
  assert.deepEqual(
    productGallery({
      media: { top: "/media/main.webp", main: "/media/main.webp" },
      gallery: [" /media/angle.webp ", "", "/media/main.webp"],
    }),
    ["/media/main.webp", "/media/angle.webp"],
  );
  assert.deepEqual(
    componentGallery({
      imageUrl: "/media/cpu.webp",
      gallery: ["/media/cpu.webp", "/media/cpu-side.webp"],
    }),
    ["/media/cpu.webp", "/media/cpu-side.webp"],
  );
});
