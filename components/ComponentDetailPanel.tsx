"use client";

import { assetUrl } from "@/lib/runtime";
import type { CatalogComponent } from "@/lib/types";
import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import CompatibilityPanel from "./CompatibilityPanel";

const icons = [Cpu, MemoryStick, HardDrive];

export default function ComponentDetailPanel({
  component,
  tab,
  setTab,
}: {
  component: CatalogComponent;
  tab: string;
  setTab: (tab: string) => void;
}) {
  const specEntries = Object.entries(component.spec);

  return (
    <aside className="detail-panel">
      <div className="panel-tabs">
        {["Overview", "Specifications", "Compatibility"].map((item) => (
          <button
            key={{ Overview: 'Tổng quan', Specifications: 'Thông số', Compatibility: 'Tương thích' }[item]}
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
            className={tab === item ? "active" : ""}
          >
            {{ Overview: 'Tổng quan', Specifications: 'Thông số', Compatibility: 'Tương thích' }[item]}
          </button>
        ))}
      </div>
      <div className="panel-content">
        {tab === "Compatibility" ? (
          <>
            <CompatibilityPanel spec={component.spec} />
            <section className="component-detail" aria-live="polite">
              <span className="eyebrow">GHI CHÚ TƯƠNG THÍCH</span>
              <p>{component.notes || "Chưa có ghi chú tương thích."}</p>
            </section>
          </>
        ) : (
          <>
            {tab === "Overview" && (
              <>
                <div className="product-overview component-overview">
                  {component.imageUrl ? (
                    <img
                      src={assetUrl(component.imageUrl)}
                      alt={component.name}
                      width={92}
                      height={122}
                      loading="lazy"
                    />
                  ) : (
                    <div className="component-overview-placeholder">
                      {component.type}
                    </div>
                  )}
                  <div>
                    <span className="eyebrow">{component.type} EXPLORER</span>
                    <p>
                      {component.description ||
                        "Chưa có mô tả cho linh kiện này."}
                    </p>
                  </div>
                </div>
                <div className="spec-grid">
                  {specEntries.slice(0, 3).map(([key, value], index) => {
                    const Icon = icons[index % icons.length];
                    return (
                      <div key={key}>
                        <span>
                          <Icon size={21} />
                        </span>
                        <b>{value || "—"}</b>
                        <small>{key}</small>
                      </div>
                    );
                  })}
                </div>
                <section className="component-detail" aria-live="polite">
                  <div className="section-heading">
                    <span className="eyebrow">THÔNG TIN LINH KIỆN</span>
                    <span className={`status-dot ${component.compatibility}`} />
                  </div>
                  <h3>{component.name}</h3>
                  <span className="accent">
                    {component.brand || component.type} · {component.model}
                  </span>
                  <p>{component.notes || "Chưa có ghi chú tương thích."}</p>
                </section>
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
                  Xem tất cả ↗
                </button>
              )}
            </div>
            <dl className="spec-table">
              {specEntries.map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </aside>
  );
}
