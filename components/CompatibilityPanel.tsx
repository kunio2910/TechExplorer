"use client";
import { useState } from "react";
import { evaluateCompatibility } from "@/lib/compatibility";
import type { AssociatedComponent } from "@/lib/types";
export default function CompatibilityPanel({
  spec,
  ssdComponents = [],
}: {
  spec: Record<string, string>;
  ssdComponents?: AssociatedComponent[];
}) {
  const [cpu, setCpu] = useState("AM5");
  const [ram, setRam] = useState("DDR5");
  const m2Slots = spec["M.2 slots"]?.trim();
  const sataPorts = spec.SATA?.trim();
  const pcieStorage = spec.PCIe?.trim();
  return (
    <section className="compatibility">
      <h3>Kiểm tra linh kiện</h3>
      <p>Kiểm tra CPU, RAM và chuẩn SSD trước khi lắp máy.</p>
      <label>
        Socket CPU
        <select value={cpu} onChange={(e) => setCpu(e.target.value)}>
          <option>AM5</option>
          <option>AM4</option>
          <option>LGA1700</option>
          <option>LGA1851</option>
        </select>
      </label>
      <label>
        Loại RAM
        <select value={ram} onChange={(e) => setRam(e.target.value)}>
          <option>DDR5</option>
          <option>DDR4</option>
        </select>
      </label>
      <section className="compatibility-storage" aria-label="SSD tương thích">
        <div className="section-heading">
          <h3>SSD tương thích</h3>
          <span className="tiny">LƯU TRỮ</span>
        </div>
        <div className="compatibility-storage-grid">
          <div>
            <span>M.2 / NVMe</span>
            <b>{m2Slots || "Chưa cập nhật"}</b>
          </div>
          <div>
            <span>Cổng SATA</span>
            <b>{sataPorts || "Chưa cập nhật"}</b>
          </div>
          <div>
            <span>PCIe cho SSD</span>
            <b>{pcieStorage || "Kiểm tra theo từng khe"}</b>
          </div>
        </div>
        {ssdComponents.length > 0 && (
          <div className="compatibility-ssd-list">
            <span className="tiny">SSD ĐƯỢC ĐỀ XUẤT</span>
            {ssdComponents.map((item) => (
              <div className="compatibility-ssd-row" key={item.id}>
                <span className={`status-dot ${item.compatibility}`} />
                <div>
                  <b>{item.name}</b>
                  <small>{item.model}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="compatibility-note">
          Đối chiếu chuẩn PCIe, số lane dùng chung và hướng dẫn của mainboard
          trước khi lắp SSD NVMe.
        </p>
      </section>
      <div aria-live="polite">
        {evaluateCompatibility(spec, cpu, ram).map((r, i) => (
          <div key={i} className={"result " + r.status}>
            <b>
              {r.status === "compatible"
                ? "✓ Tương thích"
                : r.status === "warning"
                  ? "! Kiểm tra trước khi lắp máy"
                  : "× Không tương thích"}
            </b>
            <p>{r.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
