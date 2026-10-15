"use client";
import { useEffect, useMemo, useState } from "react";
import { evaluateCompatibility } from "@/lib/compatibility";
import { specOptions } from "@/lib/spec-units";
import type { AssociatedComponent } from "@/lib/types";
export default function CompatibilityPanel({
  spec,
  ssdComponents = [],
}: {
  spec: Record<string, string>;
  ssdComponents?: AssociatedComponent[];
}) {
  const cpuOptions = useMemo(
    () => [
      ...new Set([
        ...specOptions(spec.Socket),
        "AM5",
        "AM4",
        "LGA1700",
        "LGA1851",
      ]),
    ],
    [spec.Socket],
  );
  const ramOptions = useMemo(
    () => [...new Set([...specOptions(spec["Memory type"]), "DDR5", "DDR4"])],
    [spec],
  );
  const ssdOptions = useMemo(
    () =>
      [
        ...new Set([
          ...specOptions(spec["SSD type"] ?? spec["SSD types"]),
          ...(spec["M.2 slots"] ? ["M.2 NVMe"] : []),
          ...(spec.SATA ? ["SATA"] : []),
          "M.2 NVMe",
          "M.2 SATA",
          "SATA",
        ]),
      ],
    [spec],
  );
  const [cpu, setCpu] = useState(cpuOptions[0] ?? "");
  const [ram, setRam] = useState(ramOptions[0] ?? "");
  const [ssdType, setSsdType] = useState(ssdOptions[0] ?? "");
  useEffect(() => {
    if (!cpuOptions.includes(cpu)) setCpu(cpuOptions[0] ?? "");
  }, [cpu, cpuOptions]);
  useEffect(() => {
    if (!ramOptions.includes(ram)) setRam(ramOptions[0] ?? "");
  }, [ram, ramOptions]);
  useEffect(() => {
    if (!ssdOptions.includes(ssdType)) setSsdType(ssdOptions[0] ?? "");
  }, [ssdOptions, ssdType]);
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
          {cpuOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        Loại RAM
        <select value={ram} onChange={(e) => setRam(e.target.value)}>
          {ramOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        Loại SSD
        <select value={ssdType} onChange={(e) => setSsdType(e.target.value)}>
          {ssdOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <section className="compatibility-storage" aria-label="Loại SSD">
        <div className="section-heading">
          <h3>Loại SSD</h3>
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
          trước khi lắp SSD.
        </p>
      </section>
      <div aria-live="polite">
        {evaluateCompatibility(spec, cpu, ram, ssdType).map((r, i) => (
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
