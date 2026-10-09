"use client";
import { assetUrl, basePath } from "@/lib/runtime";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Mouse,
  Network,
  Fan,
  Zap,
  ChevronRight,
  Box,
  Layers,
  ScanLine,
  Workflow,
  Plug,
  ShieldCheck,
  Sun,
  Moon,
  ArrowUpRight,
  ArrowRight,
  PackageOpen,
  SlidersHorizontal,
  MousePointer2,
  Menu,
} from "lucide-react";
import { AssociatedComponent, CatalogComponent, Product } from "@/lib/types";
import DeviceCanvas from "./DeviceCanvas";
import DetailPanel from "./DetailPanel";
import ComponentCanvas from "./ComponentCanvas";
import ComponentDetailPanel from "./ComponentDetailPanel";
const categories = [
  ["Mainboard", Cpu],
  ["CPU", Cpu],
  ["GPU", Monitor],
  ["RAM", MemoryStick],
  ["SSD", HardDrive],
  ["Power Supply", Zap],
  ["Cooling", Fan],
  ["Laptop", Monitor],
  ["Peripherals", Mouse],
  ["Networking", Network],
] as const;
const modes = [
  {
    id: "top",
    title: "2D Explorer",
    description: "Every component, connected.",
    icon: Box,
  },
  {
    id: "exploded",
    title: "Exploded View",
    description: "See the internal structure.",
    icon: Layers,
  },
  {
    id: "xray",
    title: "X-Ray View",
    description: "Look beneath the surface.",
    icon: ScanLine,
  },
  {
    id: "signal",
    title: "Signal Flow",
    description: "Follow the data pathways.",
    icon: Workflow,
  },
  {
    id: "rear_io",
    title: "Rear I/O",
    description: "Explore your connections.",
    icon: Plug,
  },
  {
    id: "compatibility",
    title: "Compatibility",
    description: "Build with confidence.",
    icon: ShieldCheck,
  },
];
const categoryAliases: Record<string, string[]> = {
  SSD: ["Storage", "SSD", "Storage (SSD)"],
  "Power Supply": ["PSU", "Power Supply"],
  Cooling: ["Cooling"],
  Laptop: ["Laptop"],
  Peripherals: ["Peripherals"],
  Networking: ["Networking"],
};
const catalogTypeByCategory: Record<string, CatalogComponent["type"]> = {
  CPU: "CPU",
  RAM: "RAM",
  SSD: "SSD",
  GPU: "GPU",
  "Power Supply": "PSU",
};
function componentTypeForCategory(
  category: AssociatedComponent["category"],
): CatalogComponent["type"] | null {
  if (
    category === "CPU" ||
    category === "RAM" ||
    category === "GPU" ||
    category === "PSU"
  ) {
    return category;
  }
  if (category === "Storage") return "SSD";
  return null;
}

function seedCatalogComponents(products: Product[]): CatalogComponent[] {
  const unique = new Map<string, CatalogComponent>();
  products.forEach((product) => {
    product.components.forEach((item) => {
      const type = componentTypeForCategory(item.category);
      if (!type || unique.has(item.id)) return;
      unique.set(item.id, {
        ...item,
        type,
        brand: "",
        imageUrl: "",
        gallery: [],
        description: item.notes,
        spec: {},
        status: "published",
      });
    });
  });
  return [...unique.values()];
}
export default function Explorer({
  products,
  initialSlug,
}: {
  products: Product[];
  initialSlug?: string;
}) {
  const compareDialog = useRef<HTMLDialogElement>(null);
  const technologyDialog = useRef<HTMLDialogElement>(null);
  const [catalog, setCatalog] = useState(products);
  const [selected, setSelected] = useState(initialSlug);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<
    "home" | "explorer" | "components"
  >(initialSlug ? "explorer" : "home");
  const [activeCategory, setActiveCategory] = useState(
    initialSlug ? "Mainboard" : "",
  );
  const [catalogComponents, setCatalogComponents] = useState<
    CatalogComponent[]
  >(() => seedCatalogComponents(products));
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );
  const [view, setView] = useState("top");
  const [tab, setTab] = useState("Overview");
  const [expert, setExpert] = useState(true);
  const [light, setLight] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let cancelled = false;
    let unsubscribeProducts = () => {};
    let unsubscribeComponents = () => {};

    async function connectRemoteCatalog() {
      try {
        const { subscribeToPublishedComponents, subscribeToPublishedProducts } =
          await import("@/lib/firestore");
        if (cancelled) return;

        unsubscribeProducts = subscribeToPublishedProducts((remoteProducts) => {
          if (cancelled) return;
          setCatalog(remoteProducts.length ? remoteProducts : products);
          setSelected((current) => {
            if (!current || remoteProducts.some((item) => item.slug === current)) {
              return current;
            }
            return initialSlug
              ? remoteProducts[0]?.slug ?? products[0]?.slug
              : undefined;
          });
        });
        unsubscribeComponents = subscribeToPublishedComponents(
          (remoteComponents) => {
            if (cancelled) return;
            const fallbackComponents = seedCatalogComponents(products);
            const remoteIds = new Set(remoteComponents.map((item) => item.id));
            setCatalogComponents([
              ...fallbackComponents.filter((item) => !remoteIds.has(item.id)),
              ...remoteComponents,
            ]);
          },
        );
      } catch {
        // Keep the bundled catalog available when Firestore is unavailable.
        try {
          const saved = JSON.parse(
            window.localStorage.getItem("tech-explorer-products-v1") ?? "[]",
          ) as Product[];
          if (!cancelled && Array.isArray(saved)) {
            const savedIds = new Set(saved.map((product) => product.id));
            setCatalog([
              ...products.filter((product) => !savedIds.has(product.id)),
              ...saved,
            ]);
          }
        } catch {
          // Ignore invalid browser-local content and keep the seed catalog.
        }
      }
    }

    void connectRemoteCatalog();
    return () => {
      cancelled = true;
      unsubscribeProducts();
      unsubscribeComponents();
    };
  }, [products]);
  const matches = useMemo(
    () =>
      catalog.filter((p) =>
        JSON.stringify([p.name, p.category, p.spec])
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [catalog, query],
  );
  const categoryProducts = useMemo(() => {
    const accepted = categoryAliases[activeCategory] ?? [activeCategory];
    return matches.filter((p) => accepted.includes(p.category));
  }, [activeCategory, matches]);
  const componentMatches = useMemo(() => {
    if (!catalogTypeByCategory[activeCategory]) {
      return [];
    }
    return catalogComponents.filter(
      (component) =>
        component.type === catalogTypeByCategory[activeCategory] &&
        JSON.stringify([
          component.name,
          component.brand,
          component.model,
          component.description,
          component.spec,
        ])
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  }, [activeCategory, catalogComponents, query]);
  const activeComponent = componentMatches.find(
    (component) => component.id === selectedComponentId,
  );
  const isCatalogComponent = !!catalogTypeByCategory[activeCategory];
  const libraryCount = isCatalogComponent
    ? componentMatches.length
    : categoryProducts.length;
  const product = catalog.find((p) => p.slug === selected) ?? catalog[0];
  function browseCategory(name: string) {
    setActiveCategory(name);
    setWorkspaceMode("components");
    setActive(null);
    setSelectedComponentId(null);
    setTab("Overview");
    setMobileMenu(false);
  }
  function choose(p: Product) {
    setSelected(p.slug);
    setWorkspaceMode("explorer");
    setActive(null);
    setSelectedComponentId(null);
    setView("top");
    setTab("Overview");
    const categorySlug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    history.replaceState(
      null,
      "",
      `${basePath}/explore/${categorySlug}/${p.slug}/`,
    );
    setMobileMenu(false);
  }
  function chooseComponent(component: CatalogComponent) {
    setSelectedComponentId(component.id);
    setWorkspaceMode("components");
    setActive(null);
    setTab("Overview");
    setMobileMenu(false);
  }
  return (
    <div className={"app-shell " + (light ? "light" : "")}>
      <dialog ref={compareDialog} className="info-dialog">
        <div className="section-heading">
          <h2>Compare mainboards</h2>
          <button onClick={() => compareDialog.current?.close()}>Close</button>
        </div>
        <p>Compare published products by their specifications.</p>
        {catalog.length < 2 && (
          <p className="muted">
            Publish a second mainboard in Admin to compare models side by side.
          </p>
        )}
        <div className="compare-scroll">
          <table>
            <thead>
              <tr>
                <th>Specification</th>
                {catalog.map((p) => (
                  <th key={p.id}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(
                new Set(catalog.flatMap((p) => Object.keys(p.spec))),
              ).map((k) => (
                <tr key={k}>
                  <th>{k}</th>
                  {catalog.map((p) => (
                    <td key={p.id}>{p.spec[k] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </dialog>
      <dialog ref={technologyDialog} className="info-dialog">
        <div className="section-heading">
          <h2>Technology, connected</h2>
          <button onClick={() => technologyDialog.current?.close()}>
            Close
          </button>
        </div>
        {product?.hotspots.map((h) => (
          <section key={h.id}>
            <h3>{h.title}</h3>
            <p>{h.description}</p>
          </section>
        ))}
      </dialog>
      <header className="header">
        <Link href="/" className="logo">
          <span className="logo-mark">
            T<span>↗</span>
          </span>
          <span>
            TECH
            <br />
            EXPLORER<small>INSIDE THE TECHNOLOGY</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <button
            className={
              workspaceMode === "explorer" || workspaceMode === "home"
                ? "nav-active"
                : ""
            }
            onClick={() => {
              setWorkspaceMode(selected ? "explorer" : "home");
              setView("top");
              setTab("Overview");
            }}
          >
            Explore
          </button>
          <button
            className={workspaceMode === "components" ? "nav-active" : ""}
            onClick={() => browseCategory("Mainboard")}
          >
            Components
          </button>
          <button
            onClick={() => {
              setWorkspaceMode("explorer");
              setTab("Compatibility");
            }}
          >
            PC Builder
          </button>
          <button onClick={() => compareDialog.current?.showModal()}>
            Compare
          </button>
          <button
            onClick={() => {
              setExpert(false);
              setNotice(
                "Beginner mode: select a component to learn how it works.",
              );
            }}
          >
            Learn
          </button>
          <button onClick={() => technologyDialog.current?.showModal()}>
            Technology
          </button>
        </nav>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search products"
            placeholder="Search model, chipset, socket…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="icon-button"
          aria-label="Toggle color theme"
          onClick={() => setLight((v) => !v)}
        >
          {light ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <Link href="/admin" className="admin-link">
          Admin <ArrowUpRight size={13} />
        </Link>
        <button
          className="mobile-menu icon-button"
          aria-label="Toggle component menu"
          onClick={() => setMobileMenu((v) => !v)}
        >
          <Menu size={20} />
        </button>
      </header>
      <div className="workspace">
        <aside className={"sidebar " + (mobileMenu ? "visible" : "")}>
          <div className="sidebar-section">
            <div className="section-heading">
              <span className="eyebrow">COMPONENTS</span>
              <span className="tiny">10</span>
            </div>
            {categories.map(([name, Icon]) => (
              <button
                key={name}
                className={
                  "category " + (activeCategory === name ? "selected" : "")
                }
                onClick={() => browseCategory(name)}
              >
                <Icon size={20} />
                <span>{name}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
          {workspaceMode === "explorer" && (
            <div className="sidebar-section models">
              <div className="section-heading">
                <span className="eyebrow">EXPLORE MODELS</span>
                <span className="tiny">{matches.length}</span>
              </div>
              {matches.map((p) => (
                <button
                  key={p.id}
                  className={
                    "model " + (product?.id === p.id ? "selected" : "")
                  }
                  onClick={() => choose(p)}
                >
                  <img
                    src={assetUrl(p.media.main)}
                    alt=""
                    width={34}
                    height={46}
                    loading="lazy"
                  />
                  <span>
                    {p.name}
                    <small>
                      {p.brand} · {p.spec.Socket}
                    </small>
                  </span>
                </button>
              ))}
              {matches.length === 0 && (
                <p className="muted">No models match “{query}”.</p>
              )}
            </div>
          )}
          <div className="sidebar-note">
            <span className="live-dot" /> KNOWLEDGE, CONNECTED.
            <p>
              Understand your hardware.
              <br />
              Make your next build count.
            </p>
          </div>
        </aside>
        {workspaceMode === "home" ? (
          <>
            <main className="explorer-main home-landing">
              <div className="breadcrumb">
                <span>Tech Explorer</span> <ChevronRight size={11} /> Trang chủ
              </div>
              <div className="home-hero">
                <div>
                  <span className="eyebrow">TECH EXPLORER</span>
                  <h1>Khám phá công nghệ</h1>
                  <p>
                    Chọn một linh kiện ở bên trái để bắt đầu tìm hiểu cấu tạo,
                    hình ảnh và thông số kỹ thuật.
                  </p>
                </div>
                <img
                  className="home-hero-image"
                  src={assetUrl("/media/explorer-home.svg")}
                  alt="Minh họa Tech Explorer"
                  width={900}
                  height={540}
                />
              </div>
              <div className="explorer-footer">
                <span>
                  <i className="live-dot" /> SYSTEM ONLINE
                </span>
                <span>SELECT A COMPONENT TO BEGIN</span>
              </div>
            </main>
            <aside className="detail-panel home-detail-panel">
              <div className="panel-content">
                <span className="eyebrow">START HERE</span>
                <h2>Chọn linh kiện để bắt đầu</h2>
                <p>
                  Duyệt mainboard hoặc thư viện CPU, RAM, SSD, GPU và PSU từ
                  menu Components.
                </p>
                <button
                  className="home-cta"
                  onClick={() => browseCategory("Mainboard")}
                >
                  Xem mainboard <ArrowRight size={15} />
                </button>
              </div>
            </aside>
          </>
        ) : workspaceMode === "components" ? (
          isCatalogComponent && activeComponent ? (
            <>
              <main className="explorer-main component-review">
                <div className="breadcrumb">
                  Components <ChevronRight size={11} /> {activeCategory}{" "}
                  <ChevronRight size={11} />{" "}
                  <span>{activeComponent.brand}</span>
                </div>
                <div className="title-row">
                  <div>
                    <span className="eyebrow">{activeCategory} EXPLORER</span>
                    <h1>{activeComponent.name}</h1>
                    <p>
                      {activeComponent.brand || activeCategory} ·{" "}
                      {activeComponent.model}
                    </p>
                  </div>
                </div>
                <ComponentCanvas
                  key={activeComponent.id}
                  component={activeComponent}
                />
                <div className="explorer-footer">
                  <span>
                    <i className="live-dot" /> SYSTEM ONLINE
                  </span>
                  <span>COMPONENT PREVIEW · IMAGE ONLY</span>
                </div>
              </main>
              <ComponentDetailPanel
                component={activeComponent}
                tab={tab}
                setTab={setTab}
              />
            </>
          ) : (
            <>
              <main className="component-browser">
                <div className="breadcrumb">
                  Components <ChevronRight size={11} />{" "}
                  <span>{activeCategory}</span>
                </div>
                <div className="browser-topline">
                  <span className="eyebrow">COMPONENT LIBRARY</span>
                  <span className="tiny">
                    {libraryCount} {libraryCount === 1 ? "DEVICE" : "DEVICES"}
                  </span>
                </div>
                <div className="browser-heading">
                  <div>
                    <h1>Explore {activeCategory}</h1>
                    <p>Choose a device to open its interactive explorer.</p>
                  </div>
                  <span className="catalog-status">
                    <i className="live-dot" /> LIVE CATALOG
                  </span>
                </div>
                <div
                  className="category-pills"
                  aria-label="Component categories"
                >
                  {categories.slice(0, 6).map(([name]) => (
                    <button
                      key={name}
                      className={activeCategory === name ? "active" : ""}
                      onClick={() => browseCategory(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {libraryCount > 0 ? (
                  <div className="device-grid">
                    {isCatalogComponent
                      ? componentMatches.map((component, index) => (
                          <button
                            key={component.id}
                            className="device-card"
                            onClick={() => chooseComponent(component)}
                            aria-label={`Open ${component.name}`}
                          >
                            <div className="device-card-media">
                              <span className="device-index">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              {component.imageUrl ? (
                                <img
                                  src={assetUrl(component.imageUrl)}
                                  alt=""
                                  width={180}
                                  height={220}
                                  loading="lazy"
                                />
                              ) : (
                                <span className="device-card-placeholder">
                                  {component.type}
                                </span>
                              )}
                              <span className="device-card-arrow">
                                <ArrowUpRight size={15} />
                              </span>
                            </div>
                            <div className="device-card-body">
                              <div className="device-card-meta">
                                <span>{component.brand || component.type}</span>
                                <span>
                                  <i className="live-dot" /> PUBLISHED
                                </span>
                              </div>
                              <h2>{component.name}</h2>
                              <p>{component.model}</p>
                              <span className="device-card-cta">
                                Open preview <ArrowRight size={14} />
                              </span>
                            </div>
                          </button>
                        ))
                      : categoryProducts.map((p, index) => (
                          <button
                            key={p.id}
                            className="device-card"
                            onClick={() => choose(p)}
                            aria-label={`Open ${p.name}`}
                          >
                            <div className="device-card-media">
                              <span className="device-index">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <img
                                src={assetUrl(p.media.main)}
                                alt=""
                                width={180}
                                height={220}
                                loading="lazy"
                              />
                              <span className="device-card-arrow">
                                <ArrowUpRight size={15} />
                              </span>
                            </div>
                            <div className="device-card-body">
                              <div className="device-card-meta">
                                <span>{p.brand}</span>
                                <span>
                                  <i className="live-dot" /> PUBLISHED
                                </span>
                              </div>
                              <h2>{p.name}</h2>
                              <p>
                                {["Chipset", "Socket", "Form factor"]
                                  .map((key) => p.spec[key])
                                  .filter(Boolean)
                                  .join("  ·  ")}
                              </p>
                              <span className="device-card-cta">
                                Open explorer <ArrowRight size={14} />
                              </span>
                            </div>
                          </button>
                        ))}
                  </div>
                ) : (
                  <div className="empty-browser">
                    <PackageOpen size={30} />
                    <span className="eyebrow">NO PUBLISHED DEVICES</span>
                    <h2>{activeCategory} is ready for discovery.</h2>
                    <p>
                      Publish a device in the content studio to make it appear
                      in this library.
                    </p>
                    <Link href="/admin">
                      Open content studio <ArrowUpRight size={14} />
                    </Link>
                  </div>
                )}
                <div className="explorer-footer">
                  <span>
                    <i className="live-dot" /> SYSTEM ONLINE
                  </span>
                  <span>SELECT A DEVICE TO CONTINUE</span>
                </div>
              </main>
              <aside className="detail-panel browse-guide">
                <div className="panel-content">
                  <div className="guide-header">
                    <span className="eyebrow">DISCOVERY PATH</span>
                    <span className="tiny">01 / 03</span>
                  </div>
                  <div className="guide-icon">
                    <MousePointer2 size={22} />
                  </div>
                  <h2>Start with a device</h2>
                  <p>
                    Browse the library in the middle panel, then open any device
                    for the full interactive view.
                  </p>
                  <div className="guide-preview">
                    <span className="eyebrow">CURRENT CATEGORY</span>
                    <strong>{activeCategory}</strong>
                    <span>
                      {libraryCount} published{" "}
                      {libraryCount === 1 ? "device" : "devices"}
                    </span>
                  </div>
                  <ol className="guide-steps">
                    <li className="current">
                      <b>01</b>
                      <span>Browse a component category</span>
                    </li>
                    <li>
                      <b>02</b>
                      <span>Select a device card</span>
                    </li>
                    <li>
                      <b>03</b>
                      <span>Explore image and specifications</span>
                    </li>
                  </ol>
                  <div className="guide-tip">
                    <SlidersHorizontal size={16} />
                    <span>
                      Tip: use Search to filter by model, chipset or socket.
                    </span>
                  </div>
                </div>
              </aside>
            </>
          )
        ) : product ? (
          <>
            <main className="explorer-main">
              <div className="breadcrumb">
                Components <ChevronRight size={11} /> Mainboard{" "}
                <ChevronRight size={11} /> <span>{product.brand}</span>
              </div>
              <div className="title-row">
                <div>
                  <span className="eyebrow">MAINBOARD EXPLORER</span>
                  <h1>{product.name}</h1>
                  <p>
                    {["Chipset", "Socket", "Memory type", "PCIe", "WiFi"]
                      .map((k) => product.spec[k])
                      .filter(Boolean)
                      .join("  /  ")}
                  </p>
                </div>
                <button
                  className="expert-toggle"
                  onClick={() => setExpert((v) => !v)}
                  aria-pressed={expert}
                >
                  <span>Beginner</span>
                  <span className={"toggle " + (expert ? "on" : "")} />
                  <span>Expert</span>
                </button>
              </div>
              <DeviceCanvas
                key={product.id + view}
                product={product}
                active={active}
                view={view}
                expert={expert}
                onSelect={(h) => {
                  setActive(h.id);
                  setTab("Overview");
                }}
              />
              <div className="mode-heading">
                <span className="eyebrow">CHANGE YOUR PERSPECTIVE</span>
                <span className="tiny">INTERACTIVE MODES</span>
              </div>
              <div className="view-switcher">
                {modes.map((m) => {
                  const available =
                    !["exploded", "xray", "rear_io"].includes(m.id) ||
                    !!product.media[m.id as "exploded" | "xray" | "rear_io"];
                  return (
                    <button
                      key={m.id}
                      disabled={!available}
                      className={
                        "view-card " +
                        (m.id === view ||
                        (m.id === "compatibility" && tab === "Compatibility")
                          ? "selected"
                          : "")
                      }
                      onClick={() => {
                        if (m.id === "compatibility") setTab("Compatibility");
                        else {
                          setView(m.id);
                          setActive(null);
                        }
                      }}
                    >
                      <m.icon size={22} />
                      <ChevronRight className="view-arrow" size={13} />
                      <b>{m.title}</b>
                      <small>
                        {available
                          ? m.description
                          : "Coming soon · image unavailable"}
                      </small>
                      <span className="mode-line" />
                    </button>
                  );
                })}
              </div>
              <div className="explorer-footer">
                <span>
                  <i className="live-dot" /> SYSTEM ONLINE
                </span>
                <span>2D INTERACTIVE · BUILT FOR DISCOVERY</span>
              </div>
            </main>
            <DetailPanel
              product={product}
              active={product.hotspots.find((h) => h.id === active)}
              tab={tab}
              setTab={setTab}
              onClose={() => setActive(null)}
            />
          </>
        ) : (
          <main className="empty">
            <h1>No published products yet</h1>
            <Link href="/admin">Create your first product</Link>
          </main>
        )}
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
