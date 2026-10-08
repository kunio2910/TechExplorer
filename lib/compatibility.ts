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
          message: `CPU socket ${cpuSocket} matches ${spec.Socket}.`,
        }
      : {
          status: "incompatible",
          message: `CPU requires ${cpuSocket}; this board uses ${spec.Socket}.`,
        },
    memoryType === spec["Memory type"]
      ? {
          status: "compatible",
          message: `${memoryType} memory matches this board.`,
        }
      : {
          status: "incompatible",
          message: `${memoryType} cannot be installed in ${spec["Memory type"]} slots.`,
        },
    {
      status: "warning",
      message:
        "Socket/type check only. Verify CPU BIOS support and memory QVL before buying.",
    },
  ];
}
