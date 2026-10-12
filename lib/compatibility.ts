export type Result = {
  status: "compatible" | "warning" | "incompatible";
  message: string;
};
export function evaluateCompatibility(
  spec: Record<string, string>,
  cpuSocket: string,
  memoryType: string,
): Result[] {
  return [
    cpuSocket === spec.Socket
      ? {
          status: "compatible",
          message: `Socket CPU ${cpuSocket} phù hợp với ${spec.Socket}.`,
        }
      : {
          status: "incompatible",
          message: `CPU cần ${cpuSocket}; mainboard sử dụng ${spec.Socket ?? 'socket chưa xác định'}.`,
        },
    memoryType === spec["Memory type"]
      ? {
          status: "compatible",
          message: `RAM ${memoryType} phù hợp với mainboard.`,
        }
      : {
          status: "incompatible",
          message: `Không thể lắp ${memoryType} vào khe ${spec['Memory type'] ?? 'chưa xác định'}.`,
        },
    {
      status: "warning",
      message:
        "Kết quả chỉ kiểm tra socket và loại RAM. Hãy xác minh BIOS hỗ trợ CPU và danh sách RAM QVL trước khi mua.",
    },
  ];
}
