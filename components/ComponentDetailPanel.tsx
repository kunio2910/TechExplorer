"use client";

import { assetUrl } from "@/lib/runtime";
import type { CatalogComponent } from "@/lib/types";
import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import CompatibilityPanel from "./CompatibilityPanel";
import { orderedSpecEntries, specLabel } from "@/lib/catalog-tools";

const icons = [Cpu, MemoryStick, HardDrive];

export default function ComponentDetailPanel({
  component,
  tab,
  setTab,
  onAddToBuild,
  onReport,
}: {
  component: CatalogComponent;
  tab: string;
  setTab: (tab: string) => void;
  onAddToBuild?: () => void;
  onReport?: () => void;
}) {
  const specEntries = orderedSpecEntries(component);

  return (
    <aside className="detail-panel">
      <div className="panel-tabs">
        {["Overview", "Specifications", "Compatibility"].map((item) => (
          <button
            key={
              {
                Overview: "Tổng quan",
                Specifications: "Thông số",
                Compatibility: "Tương thích",
              }[item]
            }
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
            className={tab === item ? "active" : ""}
          >
            {
              {
                Overview: "Tổng quan",
                Specifications: "Thông số",
                Compatibility: "Tương thích",
              }[item]
            }
          </button>
        ))}
      </div>
      <div className="panel-content">
        {tab === "Compatibility" ? (
          <>
            <p>
              Thêm linh kiện vào workspace Xây dựng cấu hình để kiểm tra với
              mainboard, RAM và nguồn cụ thể.
            </p>
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
                    <div className="component-overview-image">
                      <img
                        src={assetUrl(component.imageUrl)}
                        alt={component.name}
                        width={92}
                        height={122}
                        loading="lazy"
                      />
                      {component.imageUrl.includes("/media/sample-") && (
                        <small>Ảnh minh họa</small>
                      )}
                    </div>
                  ) : (
                    <div className="component-overview-placeholder">
                      {component.type}
                    </div>
                  )}
                  <div>
                    <span className="eyebrow">KHÁM PHÁ {component.type}</span>
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
                        <b title={value || "—"}>{value || "—"}</b>
                        <small>{specLabel(key)}</small>
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
                  <div className="detail-action-row">
                    {onAddToBuild && (
                      <button className="primary" onClick={onAddToBuild}>
                        ＋ Thêm vào cấu hình
                      </button>
                    )}
                    {onReport && (
                      <button className="text-button" onClick={onReport}>
                        Báo thông tin chưa đúng
                      </button>
                    )}
                  </div>
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
                  <dt>{specLabel(key)}</dt>
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
