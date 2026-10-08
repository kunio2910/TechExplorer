"use client";
import { assetUrl, basePath } from "@/lib/runtime";
import { motion, useReducedMotion } from "framer-motion";
import {
  Cpu,
  MemoryStick,
  Wifi,
  Layers,
  Network,
  Volume2,
  HardDrive,
  Expand,
  ArrowUpRight,
  X,
} from "lucide-react";
import { Product, Hotspot } from "@/lib/types";
import CompatibilityPanel from "./CompatibilityPanel";
const specKeys = [
  "Chipset",
  "Socket",
  "Memory type",
  "PCIe",
  "WiFi",
  "LAN",
  "Audio",
  "Form factor",
];
const icons = [
  Cpu,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Network,
  Volume2,
  Layers,
];
export default function DetailPanel({
  product,
  active,
  tab,
  setTab,
  onClose,
}: {
  product: Product;
  active: Hotspot | undefined;
  tab: string;
  setTab: (t: string) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <aside className={"detail-panel " + (active ? "sheet-open" : "")}>
      <div className="panel-tabs">
        {["Overview", "Specifications", "Compatibility"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={tab === t ? "active" : ""}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="panel-content">
        {tab === "Compatibility" ? (
          <CompatibilityPanel spec={product.spec} />
        ) : (
          <>
            {tab === "Overview" && (
              <>
                <div className="product-overview">
                  <img
                    src={assetUrl(product.media.main)}
                    alt={product.name}
                    width={92}
                    height={122}
                    loading="lazy"
                  />
                  <div>
                    <span className="eyebrow">BUILT TO EXPLORE</span>
                    <p>{product.description}</p>
                  </div>
                </div>
                <div className="spec-grid">
                  {specKeys.map((k, i) => {
                    const Icon = icons[i];
                    return (
                      <div key={k}>
                        <span>
                          <Icon size={21} />
                        </span>
                        <b>{product.spec[k] || "—"}</b>
                        <small>{k}</small>
                      </div>
                    );
                  })}
                </div>
                {active ? (
                  <motion.section
                    key={active.id}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="component-detail"
                    aria-live="polite"
                  >
                    <div className="section-heading">
                      <span className="eyebrow">COMPONENT INSIGHT</span>
                      <button
                        aria-label="Close component detail"
                        onClick={onClose}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <h3>{active.title}</h3>
                    <span className="accent">{active.subtitle}</span>
                    <p>{active.description}</p>
                  </motion.section>
                ) : (
                  <div className="component-hint">
                    <Expand size={17} /> Click any glowing node to look closer.
                  </div>
                )}
              </>
            )}
            <div className="section-heading">
              <h3>
                {tab === "Specifications"
                  ? "Full specifications"
                  : "Key specifications"}
              </h3>
              {tab === "Overview" && (
                <button
                  className="text-button"
                  onClick={() => setTab("Specifications")}
                >
                  View all <ArrowUpRight size={14} />
                </button>
              )}
            </div>
            <dl className="spec-table">
              {Object.entries(product.spec)
                .filter((_, i) => tab === "Specifications" || i < 10)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            {product.sourceUrl && (
              <a
                className="source-link"
                href={product.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Verify on manufacturer website ↗
              </a>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
