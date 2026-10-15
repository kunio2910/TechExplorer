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
import { specLabel } from "@/lib/catalog-tools";
import { categoryLabel } from "@/lib/labels";
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
  onOpenLinked,
}: {
  product: Product;
  active: Hotspot | undefined;
  tab: string;
  setTab: (t: string) => void;
  onClose: () => void;
  onOpenLinked?: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <aside className={"detail-panel " + (active ? "sheet-open" : "")}>
      <div className="panel-tabs">
        {["Overview", "Specifications", "Compatibility"].map((t) => (
          <button
            key={
              {
                Overview: "Tổng quan",
                Specifications: "Thông số",
                Compatibility: "Tương thích",
              }[t]
            }
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={tab === t ? "active" : ""}
          >
            {
              {
                Overview: "Tổng quan",
                Specifications: "Thông số",
                Compatibility: "Tương thích",
              }[t]
            }
          </button>
        ))}
      </div>
      <div className="panel-content">
        {tab === "Compatibility" ? (
          <CompatibilityPanel
            spec={product.spec}
            ssdComponents={product.components.filter(
              (component) => component.category === "Storage",
            )}
          />
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
                    <span className="eyebrow">KHÁM PHÁ CHI TIẾT</span>
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
                        <small>{specLabel(k)}</small>
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
                      <span className="eyebrow">THÔNG TIN LINH KIỆN</span>
                      <button
                        aria-label="Đóng chi tiết linh kiện"
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
                    <Expand size={17} /> Chọn vòng tròn để xem chi tiết linh
                    kiện.
                  </div>
                )}
              </>
            )}
            <div className="section-heading">
              <h3>
                {tab === "Specifications"
                  ? "Thông số đầy đủ"
                  : "Thông số chính"}
              </h3>
              {tab === "Overview" && (
                <button
                  className="text-button"
                  onClick={() => setTab("Specifications")}
                >
                  Xem tất cả <ArrowUpRight size={14} />
                </button>
              )}
            </div>
            <dl className="spec-table">
              {Object.entries(product.spec)
                .filter((_, i) => tab === "Specifications" || i < 10)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{specLabel(key)}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            {tab === "Overview" && product.components.length > 0 && (
              <section className="associated-list">
                <div className="section-heading">
                  <h3>Linh kiện đề xuất</h3>
                  <span className="tiny">
                    {product.components.length} LINH KIỆN
                  </span>
                </div>
                {product.components.map((component) => (
                  <div className="associated-row" key={component.id}>
                    <span className={`status-dot ${component.compatibility}`} />
                    <div>
                      <b>{component.name}</b>
                      <small>
                        {categoryLabel(component.category)} · {component.model}
                      </small>
                      {component.catalogId && onOpenLinked && (
                        <button
                          className="text-button"
                          onClick={() => onOpenLinked(component.catalogId!)}
                        >
                          Xem linh kiện trong thư viện ↗
                        </button>
                      )}
                    </div>
                    <span className="associated-status">
                      {
                        {
                          compatible: "Tương thích",
                          warning: "Cần kiểm tra",
                          incompatible: "Không tương thích",
                        }[component.compatibility]
                      }
                    </span>
                  </div>
                ))}
              </section>
            )}
            {product.sourceUrl && (
              <a
                className="source-link"
                href={product.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Xem thông tin từ nhà sản xuất ↗
              </a>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
