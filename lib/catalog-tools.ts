import type {
  Product,
  CatalogComponent,
  CatalogComponentType,
  CatalogMetadata,
} from "./types";
import { normalizeSpecValue } from "./spec-units";
export type Device = Product | CatalogComponent;
export const specTemplates: Record<string, Record<string, string>> = {
  Mainboard: {
    Socket: "AM5",
    "Memory type": "DDR5",
    Chipset: "",
    "Form factor": "ATX",
    "Max memory": "",
    "M.2 slots": "",
  },
  CPU: { Socket: "", Cores: "", Threads: "", "Boost clock": "", TDP: "" },
  RAM: { "Memory type": "", Capacity: "", Speed: "", Modules: "" },
  SSD: {
    Capacity: "",
    Interface: "",
    "Form factor": "",
    "Read speed": "",
    "Write speed": "",
  },
  GPU: {
    VRAM: "",
    "Memory type": "",
    "Boost clock": "",
    TDP: "",
    "Recommended PSU": "",
  },
  PSU: { Wattage: "", Efficiency: "", Modular: "", "Form factor": "" },
};
export const specLabel = (key: string) =>
  ({
    Chipset: "Chipset (bộ điều khiển)",
    Socket: "Đế CPU (Socket)",
    "Memory slots": "Số khe RAM (DIMM)",
    "Memory speed": "Tốc độ RAM",
    PCIe: "Khe mở rộng (PCIe)",
    WiFi: "Kết nối Wi-Fi",
    LAN: "Mạng có dây (LAN)",
    Audio: "Âm thanh",
    Bluetooth: "Bluetooth",
    SATA: "Cổng lưu trữ (SATA)",
    "Memory type": "Chuẩn RAM / bộ nhớ",
    "Form factor": "Kích thước",
    "Max memory": "RAM tối đa (GB)",
    "M.2 slots": "Số khe M.2",
    Cores: "Số nhân",
    Threads: "Số luồng",
    "Boost clock": "Xung tối đa (GHz)",
    TDP: "Công suất TDP (W)",
    Capacity: "Dung lượng (GB)",
    Speed: "Tốc độ (MT/s)",
    Modules: "Số thanh",
    Interface: "Chuẩn kết nối",
    "Read speed": "Tốc độ đọc (MB/s)",
    "Write speed": "Tốc độ ghi (MB/s)",
    VRAM: "VRAM (GB)",
    "Recommended PSU": "Nguồn đề xuất (W)",
    Wattage: "Công suất (W)",
    Efficiency: "Chứng nhận hiệu suất",
    Modular: "Dây nguồn tháo rời",
  })[key] ?? key;
export function stamp<T extends CatalogMetadata>(
  item: T,
  by: string,
  action = "Lưu thay đổi",
): T {
  const at = new Date().toISOString();
  return {
    ...item,
    updatedAt: at,
    updatedBy: by,
    history: [...(item.history ?? []), { at, by, action }].slice(-20),
  };
}
export function archive<T extends Device>(item: T, by: string): T {
  return stamp(
    {
      ...item,
      previousStatus: item.status,
      status: "draft",
      deletedAt: new Date().toISOString(),
    },
    by,
    "Chuyển vào thùng rác",
  );
}
export function unarchive<T extends Device>(item: T, by: string): T {
  return stamp(
    { ...item, deletedAt: undefined, status: "draft" },
    by,
    "Khôi phục từ thùng rác",
  );
}
export function publishChecks(item: Device, products: Product[]) {
  const main = "media" in item;
  const required: Record<string, string[]> = {
    Mainboard: ["Socket", "Memory type"],
    CPU: ["Socket", "Cores", "Threads"],
    RAM: ["Memory type", "Capacity", "Speed"],
    SSD: ["Capacity", "Interface"],
    GPU: ["VRAM", "TDP"],
    PSU: ["Wattage", "Efficiency"],
  };
  return [
    {
      label: "Tên và thương hiệu",
      valid: !!item.name.trim() && !!item.brand.trim(),
      field: "basic",
    },
    {
      label: "Mô tả sản phẩm",
      valid: !!item.description.trim(),
      field: "basic",
    },
    {
      label: "Thông số kỹ thuật",
      valid: (required[main ? "Mainboard" : item.type] ?? []).every(
        (key) => !!item.spec[key]?.trim(),
      ),
      field: "spec",
    },
    {
      label: "Ảnh đại diện",
      valid: !!(main ? item.media.top : item.imageUrl),
      field: "image",
    },
    ...(main
      ? [
          {
            label: "Đường dẫn hợp lệ, duy nhất",
            valid:
              /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) &&
              !products.some((p) => p.id !== item.id && p.slug === item.slug),
            field: "basic",
          },
        ]
      : []),
  ];
}
export function filterDevices<T extends Device>(
  items: T[],
  filters: Record<string, string>,
): T[] {
  return items.filter((item) =>
    Object.entries(filters).every(
      ([key, value]) =>
        !value ||
        (key === "brand"
          ? item.brand === value
          : normalizeSpecValue(key, item.spec[key] ?? "") ===
            normalizeSpecValue(key, value)),
    ),
  );
}
export function moveImage(images: string[], from: number, to: number) {
  const next = [...images];
  if (from < 0 || to < 0 || from >= next.length || to >= next.length)
    return next;
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
export const deviceType = (item: Device) =>
  "media" in item ? "Mainboard" : item.type;
