import type {
  Product,
  CatalogComponent,
  CatalogComponentType,
  CatalogMetadata,
} from "./types";
import { canonicalSpecValue, specMatches } from "./spec-units";
export type Device = Product | CatalogComponent;
export const specTemplates: Record<string, Record<string, string>> = {
  Mainboard: {
    Socket: "AM5",
    "Memory type": "DDR5",
    Chipset: "",
    "Form factor": "ATX",
    "Memory slots": "",
    "Memory speed": "",
    "Max memory": "",
    "M.2 slots": "",
    "SSD type": "M.2 NVMe, M.2 SATA, SATA",
    PCIe: "",
    WiFi: "",
    LAN: "",
    Audio: "",
  },
  CPU: {
    "CPU series": "",
    Socket: "",
    Architecture: "",
    Process: "",
    Cores: "",
    Threads: "",
    "Base clock": "",
    "Boost clock": "",
    Cache: "",
    TDP: "",
    "Integrated graphics": "",
  },
  RAM: {
    "Memory type": "",
    Capacity: "",
    Speed: "",
    Modules: "",
    "CAS latency": "",
    Voltage: "",
    ECC: "",
    "Form factor": "DIMM",
    Profile: "",
    Rank: "",
  },
  SSD: {
    Capacity: "",
    Interface: "",
    "Form factor": "",
    "Read speed": "",
    "Write speed": "",
    NAND: "",
    Controller: "",
    TBW: "",
    Cache: "",
    Heatsink: "",
  },
  GPU: {
    VRAM: "",
    "Memory type": "",
    Interface: "",
    "Base clock": "",
    "Boost clock": "",
    TDP: "",
    "Recommended PSU": "",
    Length: "",
    "Slot width": "",
    Outputs: "",
    "Ray tracing": "",
  },
  PSU: {
    Wattage: "",
    Efficiency: "",
    Modular: "",
    "Form factor": "",
    "ATX version": "",
    Fan: "",
    Connectors: "",
    Protection: "",
    Warranty: "",
  },
};

/** Common values shown in admin inputs. Datalist options remain optional hints: custom values are always accepted. */
export const specSuggestions: Record<string, string[]> = {
  "CPU series": [
    "Core i3",
    "Core i5",
    "Core i7",
    "Core i9",
    "Core Ultra 5",
    "Core Ultra 7",
    "Core Ultra 9",
    "Ryzen 3",
    "Ryzen 5",
    "Ryzen 7",
    "Ryzen 9",
    "Threadripper",
  ],
  Socket: ["AM4", "AM5", "LGA1200", "LGA1700", "LGA1851", "sTRX4", "sTR5"],
  Chipset: [
    "AMD B550",
    "AMD B650",
    "AMD B850",
    "AMD X670",
    "AMD X870",
    "Intel B660",
    "Intel B760",
    "Intel H610",
    "Intel Z690",
    "Intel Z790",
    "Intel Z890",
  ],
  "Form factor": ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX", "DIMM", "SO-DIMM", "M.2 2280", "M.2 2242", "2.5 inch"],
  "Memory slots": ["2 x DIMM", "4 x DIMM", "8 x DIMM"],
  "Memory speed": ["DDR4-3200", "DDR4-3600", "DDR5-4800", "DDR5-5200", "DDR5-5600", "DDR5-6000", "DDR5-6400", "DDR5-7200"],
  "Max memory": ["32 GB", "64 GB", "96 GB", "128 GB", "192 GB", "256 GB"],
  "M.2 slots": ["1", "2", "3", "4", "5"],
  "SSD type": ["M.2 NVMe", "M.2 SATA", "SATA"],
  PCIe: ["PCIe 3.0 x16", "PCIe 4.0 x16", "PCIe 5.0 x16", "PCIe 4.0 x4", "PCIe 5.0 x4"],
  WiFi: ["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7", "Không có"],
  LAN: ["1GbE", "2.5GbE", "5GbE", "10GbE", "Không có"],
  Audio: ["Realtek ALC897", "Realtek ALC1200", "Realtek ALC1220", "Realtek ALC4080"],
  Architecture: ["Zen 3", "Zen 4", "Zen 5", "Raptor Lake", "Arrow Lake", "Lunar Lake"],
  Process: ["7 nm", "5 nm", "4 nm", "3 nm", "Intel 7", "Intel 3"],
  Cores: ["4", "6", "8", "10", "12", "14", "16", "24", "32", "64"],
  Threads: ["8", "12", "16", "20", "24", "28", "32", "48", "64"],
  "Boost clock": ["4.5 GHz", "5.0 GHz", "5.2 GHz", "5.5 GHz", "5.7 GHz", "6.0 GHz"],
  TDP: ["35 W", "65 W", "95 W", "105 W", "120 W", "170 W", "250 W"],
  "Integrated graphics": ["Có", "Không", "Radeon Graphics", "Intel UHD Graphics", "Intel Arc Graphics"],
  Capacity: ["250 GB", "500 GB", "1 TB", "2 TB", "4 TB", "8 TB", "16 GB", "32 GB", "64 GB"],
  Speed: ["2666 MT/s", "3200 MT/s", "3600 MT/s", "4800 MT/s", "5200 MT/s", "5600 MT/s", "6000 MT/s", "6400 MT/s"],
  Modules: ["1", "2", "4"],
  "CAS latency": ["CL16", "CL18", "CL30", "CL32", "CL36", "CL40"],
  Voltage: ["1.20 V", "1.25 V", "1.35 V", "1.40 V"],
  ECC: ["Có", "Không", "On-die ECC"],
  Profile: ["Standard", "Low Profile", "XMP", "EXPO"],
  Rank: ["Single Rank", "Dual Rank"],
  Interface: ["SATA III 6Gb/s", "NVMe PCIe 3.0 x4", "NVMe PCIe 4.0 x4", "NVMe PCIe 5.0 x4"],
  "Read speed": ["3500 MB/s", "5000 MB/s", "7000 MB/s", "10000 MB/s", "14000 MB/s"],
  "Write speed": ["3000 MB/s", "4500 MB/s", "6000 MB/s", "10000 MB/s", "12000 MB/s"],
  NAND: ["TLC", "QLC", "3D TLC", "3D QLC"],
  Controller: ["Phison E18", "Phison E26", "Samsung Pascal", "Samsung Elpis", "Silicon Motion SM2264"],
  TBW: ["300 TBW", "600 TBW", "1200 TBW", "2400 TBW"],
  Cache: ["16 MB", "32 MB", "64 MB", "96 MB", "128 MB", "Không có", "DRAM", "HMB"],
  Heatsink: ["Có", "Không"],
  VRAM: ["4 GB", "6 GB", "8 GB", "12 GB", "16 GB", "20 GB", "24 GB", "32 GB"],
  "Base clock": ["2.5 GHz", "3.0 GHz", "3.5 GHz", "4.0 GHz", "4.5 GHz", "1200 MHz", "1500 MHz", "1800 MHz", "2200 MHz"],
  "Memory type": ["DDR3", "DDR4", "DDR5", "LPDDR5", "LPDDR5X", "GDDR6", "GDDR6X", "GDDR7"],
  "Recommended PSU": ["450 W", "550 W", "650 W", "750 W", "850 W", "1000 W"],
  Length: ["200 mm", "250 mm", "300 mm", "330 mm", "360 mm"],
  "Slot width": ["2-slot", "2.5-slot", "3-slot", "3.5-slot", "4-slot"],
  Outputs: ["HDMI", "DisplayPort", "HDMI + DisplayPort", "USB-C"],
  "Ray tracing": ["Có", "Không"],
  Wattage: ["450 W", "550 W", "650 W", "750 W", "850 W", "1000 W", "1200 W", "1600 W"],
  Efficiency: ["80 Plus", "80 Plus Bronze", "80 Plus Gold", "80 Plus Platinum", "80 Plus Titanium"],
  Modular: ["Modular", "Semi-Modular", "Non-Modular"],
  "ATX version": ["ATX 2.4", "ATX 2.52", "ATX 3.0", "ATX 3.1"],
  Fan: ["120 mm", "135 mm", "140 mm", "Zero RPM"],
  Connectors: ["24-pin ATX", "8-pin EPS", "12V-2x6", "PCIe 8-pin", "SATA Power"],
  Protection: ["OVP, OPP, SCP, OVP", "OVP, OPP, SCP, OTP, OCP"],
  Warranty: ["3 năm", "5 năm", "7 năm", "10 năm"],
};

const typeSpecificSuggestions: Record<string, Record<string, string[]>> = {
  Mainboard: {
    "Memory type": ["DDR4", "DDR5"],
    "Form factor": ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"],
    "Memory speed": ["DDR4-3200", "DDR4-3600", "DDR5-4800", "DDR5-5600", "DDR5-6000", "DDR5-6400", "DDR5-7200"],
  },
  CPU: {
    "Memory type": [],
    "Base clock": ["2.5 GHz", "3.0 GHz", "3.5 GHz", "4.0 GHz", "4.5 GHz"],
    Cache: ["16 MB", "32 MB", "64 MB", "96 MB", "128 MB"],
  },
  RAM: {
    "Memory type": ["DDR4", "DDR5", "LPDDR5", "LPDDR5X"],
    Capacity: ["4 GB", "8 GB", "16 GB", "24 GB", "32 GB", "48 GB", "64 GB", "96 GB", "128 GB"],
    "Form factor": ["DIMM", "SO-DIMM"],
    Cache: [],
  },
  SSD: {
    Capacity: ["250 GB", "500 GB", "1 TB", "2 TB", "4 TB", "8 TB"],
    "Memory type": [],
    Interface: ["SATA III 6Gb/s", "NVMe PCIe 3.0 x4", "NVMe PCIe 4.0 x4", "NVMe PCIe 5.0 x4"],
    "Form factor": ["M.2 2230", "M.2 2242", "M.2 2260", "M.2 2280", "2.5 inch"],
    Cache: ["Không có", "DRAM", "HMB"],
  },
  GPU: {
    "Boost clock": ["1800 MHz", "2200 MHz", "2500 MHz", "2800 MHz"],
    "Memory type": ["GDDR6", "GDDR6X", "GDDR7"],
    "Base clock": ["1200 MHz", "1500 MHz", "1800 MHz", "2200 MHz"],
    Interface: ["PCIe 3.0 x16", "PCIe 4.0 x16", "PCIe 5.0 x16"],
    Cache: [],
  },
  PSU: {
    "Form factor": ["ATX", "SFX", "SFX-L", "TFX", "Flex ATX"],
    "Memory type": [],
    Cache: [],
  },
};

export function suggestionsForSpec(type: string, key: string): string[] {
  return typeSpecificSuggestions[type]?.[key] ?? specSuggestions[key] ?? [];
}
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
    "CPU series": "Dòng CPU",
    Architecture: "Kiến trúc",
    Process: "Tiến trình",
    "Form factor": "Kích thước",
    "Max memory": "RAM tối đa (GB)",
    "M.2 slots": "Số khe M.2",
    "SSD type": "Loại SSD",
    Cores: "Số nhân",
    Threads: "Số luồng",
    "Boost clock": "Xung tối đa (GHz)",
    "Base clock": "Xung cơ bản",
    Cache: "Bộ nhớ đệm",
    "Integrated graphics": "Đồ họa tích hợp",
    TDP: "Công suất TDP (W)",
    Capacity: "Dung lượng (GB)",
    Speed: "Tốc độ (MT/s)",
    Modules: "Số thanh",
    "CAS latency": "Độ trễ CAS",
    Voltage: "Điện áp",
    ECC: "ECC",
    Profile: "Cấu hình",
    Rank: "Xếp hạng chip",
    Interface: "Chuẩn kết nối",
    "Read speed": "Tốc độ đọc (MB/s)",
    "Write speed": "Tốc độ ghi (MB/s)",
    NAND: "Loại NAND",
    Controller: "Bộ điều khiển",
    TBW: "Độ bền ghi (TBW)",
    Heatsink: "Tản nhiệt",
    VRAM: "VRAM (GB)",
    "Recommended PSU": "Nguồn đề xuất (W)",
    Length: "Chiều dài",
    "Slot width": "Độ dày khe",
    Outputs: "Cổng xuất hình",
    "Ray tracing": "Ray Tracing",
    Wattage: "Công suất (W)",
    Efficiency: "Chứng nhận hiệu suất",
    Modular: "Dây nguồn tháo rời",
    "ATX version": "Chuẩn ATX",
    Fan: "Quạt",
    Connectors: "Đầu kết nối",
    Protection: "Bảo vệ điện",
    Warranty: "Bảo hành",
  })[key] ?? key;

const specOrder: Record<string, string[]> = {
  Mainboard: [
    "Chipset",
    "Socket",
    "Memory type",
    "Memory slots",
    "Max memory",
    "Memory speed",
    "PCIe",
    "M.2 slots",
    "SSD type",
    "SATA",
    "Form factor",
    "WiFi",
    "LAN",
    "Audio",
  ],
  CPU: ["Socket", "Cores", "Threads", "Boost clock", "TDP"],
  RAM: ["Memory type", "Capacity", "Speed", "Modules"],
  SSD: ["Capacity", "Interface", "Form factor", "Read speed", "Write speed"],
  GPU: ["VRAM", "Memory type", "Boost clock", "TDP", "Recommended PSU"],
  PSU: ["Wattage", "Efficiency", "Modular", "Form factor"],
};

export function orderedSpecEntries(item: Device) {
  const type = deviceType(item);
  const order = specOrder[type] ?? [];
  const position = new Map(order.map((key, index) => [key, index]));
  return Object.entries(item.spec).sort(
    ([a], [b]) => (position.get(a) ?? 1000) - (position.get(b) ?? 1000),
  );
}

export function comparableSpecValue(key: string, value: string | undefined) {
  return canonicalSpecValue(key, value ?? "");
}
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
          : specMatches(key, item.spec[key], value)),
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
