"use client";
import { useMemo, useState, useRef } from "react";
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
  Menu,
} from "lucide-react";
import { Product } from "@/lib/types";
import DeviceCanvas from "./DeviceCanvas";
import DetailPanel from "./DetailPanel";
const categories = [
  ["Mainboard", Cpu],
  ["CPU", Cpu],
  ["GPU", Monitor],
  ["RAM", MemoryStick],
  ["Storage (SSD)", HardDrive],
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
export default function Explorer({
  products,
  initialSlug,
}: {
  products: Product[];
  initialSlug?: string;
}) {
  const compareDialog = useRef<HTMLDialogElement>(null);
  const technologyDialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(initialSlug ?? products[0]?.slug);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState("top");
  const [tab, setTab] = useState("Overview");
  const [expert, setExpert] = useState(true);
  const [light, setLight] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const matches = useMemo(
    () =>
      products.filter((p) =>
        JSON.stringify([p.name, p.category, p.spec])
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [products, query],
  );
  const product = products.find((p) => p.slug === selected) ?? products[0];
  function choose(p: Product) {
    setSelected(p.slug);
    setActive(null);
    setView("top");
    setTab("Overview");
    history.replaceState(null, "", `/explore/mainboard/${p.slug}`);
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
        {products.length < 2 && (
          <p className="muted">
            Publish a second mainboard in Admin to compare models side by side.
          </p>
        )}
        <div className="compare-scroll">
          <table>
            <thead>
              <tr>
                <th>Specification</th>
                {products.map((p) => (
                  <th key={p.id}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(
                new Set(products.flatMap((p) => Object.keys(p.spec))),
              ).map((k) => (
                <tr key={k}>
                  <th>{k}</th>
                  {products.map((p) => (
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
            className="nav-active"
            onClick={() => {
              setView("top");
              setTab("Overview");
            }}
          >
            Explore
          </button>
          <button onClick={() => setMobileMenu((v) => !v)}>Components</button>
          <button onClick={() => setTab("Compatibility")}>PC Builder</button>
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
                  "category " + (name === "Mainboard" ? "selected" : "")
                }
                onClick={() =>
                  name === "Mainboard"
                    ? setNotice("Explore our published mainboard collection.")
                    : setNotice(
                        `${name} explorers are coming in a future release.`,
                      )
                }
              >
                <Icon size={20} />
                <span>{name}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
          <div className="sidebar-section models">
            <div className="section-heading">
              <span className="eyebrow">EXPLORE MODELS</span>
              <span className="tiny">{matches.length}</span>
            </div>
            {matches.map((p) => (
              <button
                key={p.id}
                className={"model " + (product?.id === p.id ? "selected" : "")}
                onClick={() => choose(p)}
              >
                <img
                  src={p.media.main}
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
          <div className="sidebar-note">
            <span className="live-dot" /> KNOWLEDGE, CONNECTED.
            <p>
              Understand your hardware.
              <br />
              Make your next build count.
            </p>
          </div>
        </aside>
        {product ? (
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
