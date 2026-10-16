export type Result = {
  status: "compatible" | "warning" | "incompatible";
  message: string;
};
export function evaluateCompatibility(
  spec: Record<string, string>,
  cpuSocket: string,
  memoryType: string,
  ssdType?: string,
): Result[] {
  const matchesSpecOption = (key: string, value: string) =>
    (spec[key] ?? "")
      .split(/[,;|\n]+/)
      .map((item) => item.trim().toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean)
      .includes(value.trim().toUpperCase().replace(/\s+/g, ""));
  const results: Result[] = [
    matchesSpecOption("Socket", cpuSocket)
      ? {
          status: "compatible",
          message: `Socket CPU ${cpuSocket} phù hợp với ${spec.Socket}.`,
        }
      : {
          status: "incompatible",
          message: `CPU cần ${cpuSocket}; mainboard sử dụng ${spec.Socket ?? 'socket chưa xác định'}.`,
        },
    matchesSpecOption("Memory type", memoryType)
      ? {
          status: "compatible",
          message: `RAM ${memoryType} phù hợp với mainboard.`,
        }
      : {
          status: "incompatible",
          message: `Không thể lắp ${memoryType} vào khe ${spec['Memory type'] ?? 'chưa xác định'}.`,
        },
  ];
  if (ssdType) {
    const supported = (spec["SSD type"] ?? spec["SSD types"] ?? "")
      .split(/[,;|\n]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    results.splice(2, 0,
      supported.length && supported.includes(ssdType.trim().toLowerCase())
        ? {
            status: "compatible",
            message: `SSD ${ssdType} nằm trong danh sách chuẩn lưu trữ của mainboard.`,
          }
        : {
            status: "warning",
            message: `Chưa có dữ liệu xác nhận SSD ${ssdType}; hãy kiểm tra khe và hướng dẫn của mainboard.`,
          },
    );
  }
  return results;
}
