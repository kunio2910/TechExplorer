import type { Device } from "./catalog-tools";
import { deviceType } from "./catalog-tools";
import { normalizeSpecValue, specNumber } from "./spec-units";
export const buildSlots = [
  "Mainboard",
  "CPU",
  "RAM",
  "SSD",
  "GPU",
  "PSU",
] as const;
export type BuildSlot = (typeof buildSlots)[number];
export type PcBuild = {
  id: string;
  name: string;
  parts: Partial<Record<BuildSlot, string>>;
  ramKits: number;
  drives: number;
  updatedAt?: string;
};
export const newBuild = (): PcBuild => ({
  id: crypto.randomUUID(),
  name: "Cấu hình PC mới",
  parts: {},
  ramKits: 1,
  drives: 1,
});
export type BuildCheck = {
  title: string;
  status: "compatible" | "warning" | "incompatible";
  detail: string;
};
export function validateBuild(input: unknown): PcBuild {
  if (!input || typeof input !== "object")
    throw Error("Link cấu hình không hợp lệ.");
  const b = input as PcBuild;
  if (
    typeof b.id !== "string" ||
    b.id.length > 100 ||
    typeof b.name !== "string" ||
    b.name.length > 120 ||
    !b.parts ||
    typeof b.parts !== "object" ||
    Array.isArray(b.parts) ||
    Object.entries(b.parts).some(
      ([k, v]) =>
        !buildSlots.includes(k as BuildSlot) ||
        typeof v !== "string" ||
        v.length > 200,
    ) ||
    !Number.isInteger(b.ramKits) ||
    b.ramKits < 1 ||
    b.ramKits > 8 ||
    !Number.isInteger(b.drives) ||
    b.drives < 1 ||
    b.drives > 16
  )
    throw Error("Link cấu hình không hợp lệ.");
  return {
    id: b.id,
    name: b.name,
    parts: b.parts,
    ramKits: b.ramKits,
    drives: b.drives,
  };
}
export function selectedParts(build: PcBuild, devices: Device[]) {
  return Object.fromEntries(
    buildSlots.map((slot) => [
      slot,
      devices.find(
        (item) => item.id === build.parts[slot] && deviceType(item) === slot,
      ),
    ]),
  ) as Partial<Record<BuildSlot, Device>>;
}
export function checkBuild(build: PcBuild, devices: Device[]): BuildCheck[] {
  const p = selectedParts(build, devices),
    checks: BuildCheck[] = [];
  for (const slot of buildSlots)
    if (!p[slot])
      checks.push({
        title: slot,
        status: "warning",
        detail: build.parts[slot]
          ? "Thiết bị không còn được xuất bản. Hãy chọn lại."
          : "Chưa chọn thiết bị.",
      });
  const compare = (title: string, a?: string, b?: string) =>
    checks.push({
      title,
      status: !a || !b ? "warning" : a === b ? "compatible" : "incompatible",
      detail: !a || !b ? "Thiếu thông số để kiểm tra." : `${a} / ${b}`,
    });
  if (p.Mainboard && p.CPU)
    compare(
      "Socket CPU và mainboard",
      normalizeSpecValue("Socket", p.CPU.spec.Socket ?? ""),
      normalizeSpecValue("Socket", p.Mainboard.spec.Socket ?? ""),
    );
  if (p.Mainboard && p.RAM) {
    compare(
      "Chuẩn bộ nhớ RAM",
      normalizeSpecValue("Memory type", p.RAM.spec["Memory type"] ?? ""),
      normalizeSpecValue("Memory type", p.Mainboard.spec["Memory type"] ?? ""),
    );
    const capacity = specNumber("Capacity", p.RAM.spec.Capacity, "GB"),
      max = specNumber("Max memory", p.Mainboard.spec["Max memory"], "GB");
    checks.push({
      title: "Dung lượng RAM",
      status:
        capacity && max
          ? capacity * build.ramKits <= max
            ? "compatible"
            : "incompatible"
          : "warning",
      detail:
        capacity && max
          ? `${capacity * build.ramKits} GB / tối đa ${max} GB`
          : "Thiếu dung lượng hoặc RAM tối đa.",
    });
    const modules = specNumber("Modules", p.RAM.spec.Modules),
      slots = Number(p.Mainboard.spec["Memory slots"]?.match(/^\d+/)?.[0]);
    checks.push({
      title: "Số khe RAM",
      status:
        modules && slots
          ? modules * build.ramKits <= slots
            ? "compatible"
            : "incompatible"
          : "warning",
      detail:
        modules && slots
          ? `${modules * build.ramKits} thanh / ${slots} khe`
          : "Chưa đủ thông tin số thanh và khe RAM.",
    });
  }
  if (p.Mainboard && p.SSD) {
    const m2 = /m\.?2|nvme/i.test(
        `${p.SSD.spec.Interface} ${p.SSD.spec["Form factor"]}`,
      ),
      sata = /sata/i.test(p.SSD.spec.Interface ?? "");
    const available = m2
      ? specNumber("M.2 slots", p.Mainboard.spec["M.2 slots"])
      : sata
        ? Number(p.Mainboard.spec.SATA?.match(/^\d+/)?.[0])
        : undefined;
    checks.push({
      title: "Kết nối và số ổ SSD",
      status: available
        ? build.drives <= available
          ? "compatible"
          : "incompatible"
        : "warning",
      detail: available
        ? `${build.drives} ổ / ${available} ${m2 ? "khe M.2" : "cổng SATA"}. Cần kiểm tra chia sẻ lane trong hướng dẫn mainboard.`
        : "Chưa xác định được giao tiếp hoặc số cổng tương ứng.",
    });
  }
  const cpuW = specNumber("TDP", p.CPU?.spec.TDP, "W"),
    gpuW = specNumber("TDP", p.GPU?.spec.TDP, "W"),
    psuW = specNumber("Wattage", p.PSU?.spec.Wattage, "W");
  const estimated =
    cpuW && gpuW ? Math.ceil(((cpuW + gpuW + 100) * 1.3) / 50) * 50 : undefined;
  const recommended = specNumber(
    "Recommended PSU",
    p.GPU?.spec["Recommended PSU"],
    "W",
  );
  const target = estimated
    ? Math.max(estimated, recommended ?? 0)
    : recommended;
  checks.push({
    title: "Nguồn điện",
    status:
      psuW && target
        ? psuW >= target
          ? "warning"
          : "incompatible"
        : "warning",
    detail:
      psuW && target
        ? `Nguồn ${psuW} W; mức tham khảo ${target} W. Ước tính từ TDP CPU/GPU, 100 W cho phần còn lại và 30% dự phòng; cần kiểm tra đầu cấp nguồn và tải thực tế.`
        : "Thiếu TDP hoặc công suất nguồn để ước tính.",
  });
  checks.push({
    title: "BIOS, QVL và kích thước lắp đặt",
    status: "warning",
    detail:
      "Xác minh BIOS hỗ trợ CPU, RAM QVL, chiều dài GPU, tản nhiệt, vỏ máy và đầu cấp nguồn. Thư viện hiện quản lý sáu nhóm linh kiện; các mục này cần đối chiếu tài liệu nhà sản xuất.",
  });
  return checks;
}
