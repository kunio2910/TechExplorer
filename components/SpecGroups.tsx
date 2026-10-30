"use client";
import { Children, isValidElement, useState, type ReactNode } from "react";
import { specLabel } from "@/lib/catalog-tools";
export default function SpecGroups({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState(""),
    [filled, setFilled] = useState(false);
  const groups: Record<string, ReactNode[]> = {
    "Cơ bản": [],
    "Hiệu năng": [],
    "Bộ nhớ": [],
    "Kết nối": [],
    "Điện và kích thước": [],
  };
  Children.forEach(children, (child) => {
    if (!isValidElement<{ field: string; value: string }>(child)) return;
    const { field, value } = child.props;
    if (
      (filled && !value.trim()) ||
      !`${field} ${specLabel(field)}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
      return;
    const group =
      /memory|cache|capacity|nand|rank|ecc|modules|latency|vram/i.test(field)
        ? "Bộ nhớ"
        : /socket|interface|pcie|ssd|sata|m\.2|wifi|lan|audio|outputs|connectors|bluetooth/i.test(
              field,
            )
          ? "Kết nối"
          : /tdp|watt|voltage|length|factor|width|psu|fan|protection|efficiency|modular|atx/i.test(
                field,
              )
            ? "Điện và kích thước"
            : /clock|cores|threads|speed|tbw/i.test(field)
              ? "Hiệu năng"
              : "Cơ bản";
    groups[group].push(child);
  });
  return (
    <div>
      <label>
        Tìm thông số
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Socket, dung lượng, công suất…"
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={filled}
          onChange={(e) => setFilled(e.target.checked)}
        />
        Chỉ hiện ô đã nhập
      </label>
      {Object.entries(groups)
        .filter(([, fields]) => fields.length)
        .map(([name, fields]) => (
          <details
            key={`${name}-${!!query}-${filled}`}
            open={!!query || filled}
            className="admin-collapsible"
          >
            <summary>
              {name} · {fields.length}
            </summary>
            <div className="admin-form-grid">{fields}</div>
          </details>
        ))}
    </div>
  );
}
