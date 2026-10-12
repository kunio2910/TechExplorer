"use client";
import type { Device } from "@/lib/catalog-tools";
import { specLabel } from "@/lib/catalog-tools";
export default function CatalogFilters({
  items,
  value,
  onChange,
}: {
  items: Device[];
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  const keys = ["brand", "Socket", "Memory type", "Capacity", "Wattage"];
  return (
    <section className="catalog-filters">
      <div className="section-heading">
        <h3>Bộ lọc</h3>
        <button onClick={() => onChange({})}>Xóa bộ lọc</button>
      </div>
      {keys.map((key) => {
        const options = [
          ...new Set(
            items
              .map((item) => (key === "brand" ? item.brand : item.spec[key]))
              .filter(Boolean),
          ),
        ].sort();
        return options.length ? (
          <label key={key}>
            {key === "brand" ? "Hãng" : specLabel(key)}
            <select
              aria-label={key === "brand" ? "Hãng" : specLabel(key)}
              value={value[key] ?? ""}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            >
              <option value="">Tất cả</option>
              {options.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        ) : null;
      })}
    </section>
  );
}
