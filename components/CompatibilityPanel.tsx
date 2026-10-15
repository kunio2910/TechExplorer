"use client";
import { useEffect, useMemo, useState } from "react";
import { evaluateCompatibility } from "@/lib/compatibility";
import { specOptions } from "@/lib/spec-units";
export default function CompatibilityPanel({
  spec,
}: {
  spec: Record<string, string>;
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
