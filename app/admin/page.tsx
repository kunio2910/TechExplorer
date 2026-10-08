"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Product, Hotspot, mediaRoles, MediaRole } from "@/lib/types";
import DetailPanel from "@/components/DetailPanel";
import DeviceCanvas from "@/components/DeviceCanvas";
const blank = (): Product => ({
  id: crypto.randomUUID(),
  slug: "new-mainboard",
  name: "New mainboard",
  brand: "",
  category: "Mainboard",
  description: "",
  status: "draft",
  spec: { Socket: "AM5", "Memory type": "DDR5" },
  media: {},
  hotspots: [],
});
export default function Admin() {
  const [ratio, setRatio] = useState(720 / 950);
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [token, setToken] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [role, setRole] = useState<MediaRole>("top");
  async function load() {
    try {
      const response = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw Error("Failed to load products.");
      const data: Product[] = await response.json();
      setProducts(data);
      setProduct((p) => p ?? data[0] ?? blank());
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const active = product?.hotspots.find((h) => h.id === selected);
  function update(patch: Partial<Product>) {
    setProduct((p) => (p ? { ...p, ...patch } : p));
  }
  function updateHotspot(patch: Partial<Hotspot>) {
    if (product && active)
      update({
        hotspots: product.hotspots.map((h) =>
          h.id === active.id ? { ...h, ...patch } : h,
        ),
      });
  }
  async function save(status: "draft" | "published") {
    if (!product) return;
    setBusy(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...product, status }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      update({ status });
      setMessage(
        status === "published"
          ? "Published. Open Explorer to see your product."
          : "Draft saved.",
      );
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      update({
        media: {
          ...product?.media,
          [role]: data.url,
          ...(role === "top" && !product?.media.main ? { main: data.url } : {}),
        },
      });
      setMessage(`${role} image uploaded. Save the product to keep it.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!product || !window.confirm(`Delete ${product.name}?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: product.id }),
      });
      if (!response.ok) throw Error("Delete failed.");
      setProduct(null);
      await load();
      setMessage("Product deleted.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-shell">
      <div className="admin-header">
        <div>
          <span className="eyebrow">TECH EXPLORER / CONTENT STUDIO</span>
          <h1>Product & Hotspot Editor</h1>
          <p className="admin-title-note">
            Create a product. Add its images. Connect the details.
          </p>
        </div>
        <Link href="/">← Back to Explorer</Link>
      </div>
      <div className="admin-controls">
        <input
          type="password"
          aria-label="Admin token"
          placeholder="Admin token from ADMIN_TOKEN"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button onClick={load}>Load all products</button>
        <select
          aria-label="Select product"
          value={product?.id ?? ""}
          onChange={(e) => {
            setProduct(products.find((p) => p.id === e.target.value) ?? null);
            setSelected(null);
          }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.status})
            </option>
          ))}
        </select>
        <button
          className="primary"
          onClick={() => {
            setProduct(blank());
            setSelected(null);
          }}
        >
          + New product
        </button>
      </div>
      {message && (
        <div className="admin-message" role="status">
          {message}
        </div>
      )}
      {product && (
        <div className="admin-layout">
          <section className="admin-form">
            <h2>Product details</h2>
            {(["name", "slug", "brand", "description"] as const).map((k) => (
              <label key={k}>
                {k}
                <input
                  value={product[k]}
                  onChange={(e) => update({ [k]: e.target.value })}
                />
              </label>
            ))}
            <p className="muted">
              Category: Mainboard · Status: {product.status}
            </p>
            <label>
              Manufacturer source URL
              <input
                value={product.sourceUrl ?? ""}
                onChange={(e) => update({ sourceUrl: e.target.value })}
              />
            </label>
            <h3>Specifications</h3>
            {Object.entries(product.spec).map(([k, v]) => (
              <label key={k}>
                {k}
                <input
                  value={v}
                  onChange={(e) =>
                    update({ spec: { ...product.spec, [k]: e.target.value } })
                  }
                />
              </label>
            ))}
            <button
              onClick={() => {
                const key = window.prompt("Specification name (e.g. Chipset)");
                if (key?.trim())
                  update({ spec: { ...product.spec, [key.trim()]: "" } });
              }}
            >
              + Add specification
            </button>
            <h3 style={{ marginTop: 25 }}>Media library</h3>
            <label>
              Image role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MediaRole)}
              >
                {mediaRoles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Image URL
              <input
                placeholder="https://… or /uploads/…"
                value={product.media[role] ?? ""}
                onChange={(e) =>
                  update({
                    media: { ...product.media, [role]: e.target.value },
                  })
                }
              />
            </label>
            <label className="upload-row">
              Upload PNG / JPG / WebP / AVIF (max 8 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files?.[0]) void upload(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="admin-actions">
              <button disabled={busy} onClick={() => save("draft")}>
                Save draft
              </button>
              <button
                disabled={busy}
                className="primary"
                onClick={() => save("published")}
              >
                {busy ? "Working…" : "Publish"}
              </button>
              <button onClick={() => setPreview((v) => !v)}>Preview</button>
              <button disabled={busy} className="danger" onClick={remove}>
                Delete
              </button>
            </div>
          </section>
          <section>
            <div className="editor-wrap">
              <h2>Place your hotspots</h2>
              <p>
                Click the image to create a node. Select a node to edit its
                content. Coordinates are calculated automatically.
              </p>
              <label>
                Editor view
                <select
                  value={role === "rear_io" ? "rear_io" : "top"}
                  onChange={(e) => {
                    setRole(e.target.value as MediaRole);
                    setSelected(null);
                  }}
                >
                  <option value="top">Top / Mainboard</option>
                  <option value="rear_io">Rear I/O</option>
                </select>
              </label>
              <div
                className="editor-board"
                style={{ aspectRatio: ratio }}
                onClick={(e) => {
                  if (!product.media[role === "rear_io" ? "rear_io" : "top"])
                    return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const h: Hotspot = {
                    id: crypto.randomUUID(),
                    type: "component",
                    view: role === "rear_io" ? "rear_io" : "top",
                    x:
                      Math.round(
                        ((e.clientX - rect.left) / rect.width) * 10000,
                      ) / 100,
                    y:
                      Math.round(
                        ((e.clientY - rect.top) / rect.height) * 10000,
                      ) / 100,
                    title: "New component",
                    subtitle: "",
                    description: "",
                  };
                  update({ hotspots: [...product.hotspots, h] });
                  setSelected(h.id);
                }}
              >
                {product.media[role === "rear_io" ? "rear_io" : "top"] ? (
                  <img
                    src={product.media[role === "rear_io" ? "rear_io" : "top"]}
                    alt="Hotspot editing canvas"
                    onLoad={(e) =>
                      setRatio(
                        e.currentTarget.naturalWidth /
                          e.currentTarget.naturalHeight,
                      )
                    }
                  />
                ) : (
                  <p>Upload a top image to begin.</p>
                )}
                {product.hotspots
                  .filter(
                    (h) => h.view === (role === "rear_io" ? "rear_io" : "top"),
                  )
                  .map((h, i) => (
                    <button
                      key={h.id}
                      className={
                        "editor-node " + (selected === h.id ? "selected" : "")
                      }
                      style={{ left: `${h.x}%`, top: `${h.y}%` }}
                      aria-label={`Edit ${h.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(h.id);
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
              </div>
              {active && (
                <div className="editor-fields">
                  {(["title", "subtitle", "type", "description"] as const).map(
                    (k) => (
                      <label
                        key={k}
                        className={k === "description" ? "wide" : ""}
                      >
                        {k}
                        <input
                          value={active[k]}
                          onChange={(e) =>
                            updateHotspot({ [k]: e.target.value })
                          }
                        />
                      </label>
                    ),
                  )}
                  <p className="muted">
                    Position: {active.x}% / {active.y}%
                  </p>
                  <button
                    className="danger"
                    onClick={() => {
                      update({
                        hotspots: product.hotspots.filter(
                          (h) => h.id !== selected,
                        ),
                      });
                      setSelected(null);
                    }}
                  >
                    Remove hotspot
                  </button>
                </div>
              )}
            </div>
            {preview && (
              <div className="preview-box">
                <h2>Explorer preview</h2>
                <DeviceCanvas
                  product={product}
                  active={selected}
                  onSelect={(h) => setSelected(h.id)}
                  view="top"
                  expert={true}
                />
                <DetailPanel
                  product={product}
                  active={active}
                  tab={tab}
                  setTab={setTab}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
