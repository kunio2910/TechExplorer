import type { CatalogComponent, Product } from "./types";
const translations: Record<string, string> = {
  "A powerful foundation for your next build. Discover the connections, components, and engineering behind the ROG Strix B850-F.":
    "Nền tảng cho cấu hình PC của bạn. Khám phá cổng kết nối, linh kiện và thiết kế của bo mạch chủ ROG Strix B850-F.",
  "AM5 processor; verify BIOS support before installation.":
    "Bộ xử lý dùng socket AM5; kiểm tra BIOS hỗ trợ CPU trước khi lắp đặt.",
  "Use a matched dual-channel kit for best results.":
    "Ưu tiên một bộ RAM đồng nhất để sử dụng bộ nhớ hai kênh (dual-channel).",
  "Install in an M.2 slot with its heatsink.":
    "Lắp vào khe M.2 và sử dụng tản nhiệt phù hợp.",
  "Rear I/O": "Cổng kết nối phía sau (Rear I/O)",
  "Your connection hub": "Trung tâm kết nối thiết bị",
  "CPU Socket": "Đế CPU (CPU Socket)",
  "Memory (RAM)": "Bộ nhớ trong (RAM)",
  "PCIe Expansion": "Khe mở rộng (PCIe)",
  "M.2 Storage": "Ổ lưu trữ M.2 (M.2 Storage)",
  "Connect displays, USB peripherals, Ethernet, audio and the Wi-Fi antenna through the rear I/O panel.":
    "Kết nối màn hình, thiết bị USB, mạng có dây (Ethernet), âm thanh và ăng-ten Wi-Fi qua bảng cổng phía sau (Rear I/O).",
  "The AM5 socket connects the processor to memory and high-speed PCIe lanes. Always check the ASUS CPU support list and required BIOS before installing a processor.":
    "Socket AM5 kết nối bộ xử lý với RAM và các đường truyền tốc độ cao (PCIe lane). Kiểm tra danh sách CPU được ASUS hỗ trợ và phiên bản BIOS cần thiết trước khi lắp CPU.",
  "Dual-channel DDR5 memory holds the data your processor needs right now. Install a matched kit in the recommended slots; overclocked speeds depend on your CPU and memory kit.":
    "RAM DDR5 hai kênh (dual-channel) lưu dữ liệu mà bộ xử lý đang cần. Lắp bộ RAM đồng nhất vào các khe khuyến nghị; tốc độ ép xung phụ thuộc CPU và bộ RAM.",
  "The reinforced expansion slot connects a graphics card directly to the processor. Available bandwidth and lane sharing depend on the CPU and installed devices.":
    "Khe mở rộng được gia cố kết nối card đồ họa trực tiếp với bộ xử lý. Băng thông và cách chia sẻ đường truyền (lane) phụ thuộc CPU cùng các thiết bị đang lắp.",
  "Compact NVMe drives connect through PCIe for fast storage. Heatsinks help control drive temperature; consult the manual for slot bandwidth and lane sharing.":
    "Ổ NVMe nhỏ gọn kết nối qua PCIe để lưu trữ tốc độ cao. Tản nhiệt giúp kiểm soát nhiệt độ; tra hướng dẫn mainboard để biết băng thông khe và cách chia sẻ đường truyền (lane).",
  "4 × M.2 slots": "4 khe M.2",
};
export const vietnameseText = (text: string) => translations[text] ?? text;
export function localizeDevice<T extends Product | CatalogComponent>(
  item: T,
): T {
  return {
    ...item,
    description: vietnameseText(item.description),
    ...("media" in item
      ? {
          hotspots: item.hotspots.map((h) => ({
            ...h,
            title: vietnameseText(h.title),
            subtitle: vietnameseText(h.subtitle),
            description: vietnameseText(h.description),
          })),
          components: item.components.map((c) => ({
            ...c,
            notes: vietnameseText(c.notes),
          })),
        }
      : { notes: vietnameseText(item.notes) }),
  };
}
