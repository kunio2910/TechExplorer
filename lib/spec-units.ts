const units: Record<string, string> = {
  Capacity: "GB",
  VRAM: "GB",
  "Max memory": "GB",
  TDP: "W",
  Wattage: "W",
  "Recommended PSU": "W",
  "Boost clock": "GHz",
  Speed: "MT/s",
  "Memory speed": "MT/s",
  "Read speed": "MB/s",
  "Write speed": "MB/s",
  Voltage: "V",
  Length: "mm",
  TBW: "TBW",
};
const canonical: Record<string, string> = {
  gb: "GB",
  tb: "TB",
  mb: "MB",
  gib: "GiB",
  mib: "MiB",
  w: "W",
  kw: "kW",
  mhz: "MHz",
  ghz: "GHz",
  "mt/s": "MT/s",
  "mb/s": "MB/s",
  "gb/s": "GB/s",
  mm: "mm",
  v: "V",
  tbw: "TBW",
};
export function normalizeSpecValue(key: string, input: string): string {
  let value = input.trim().replace(/\s+/g, " ");
  if (key === "Memory type") {
    return value
      .split(/[,;|\n]+/)
      .map((item) =>
        item
          .trim()
          .replace(/\s+/g, "")
          .replace(/^DDR(\d+)(?:UDIMM|DIMM)?$/i, "DDR$1")
          .toUpperCase(),
      )
      .filter(Boolean)
      .join(", ");
  }
  if (key === "Socket")
    return value.toUpperCase().replace(/\s+/g, "");
  if (key === "SSD type") {
    return value
      .split(/[,;|\n]+/)
      .map((item) => canonicalToken(item))
      .filter(Boolean)
      .join(", ");
  }
  // Do not reinterpret Gb (network bit rates) as GB (capacity), or alter prose.
  if (!units[key]) return value;
  // Normalize decimal commas, but preserve unrecognized prose and numbers.
  if (/^\d+,\d{1,2}(\s*[a-z/]+)?$/i.test(value))
    value = value.replace(",", ".");
  value = value.replace(
    /(\d(?:[\d.]*\d)?)(\s*)(GiB|MiB|GB|TB|MB|kW|W|GHz|MHz|MT\/s|MB\/s|GB\/s|mm|V|TBW)\b/gi,
    (_, number: string, _space: string, unit: string) =>
      `${number} ${canonical[unit.toLowerCase()]}`,
  );
  if (/^\d+(?:\.\d+)?$/.test(value) && units[key]) value += ` ${units[key]}`;
  return value;
}

function canonicalToken(input: string): string {
  const value = input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^M\.?\s*2\s*[- ]?NVME$/i, "M.2 NVMe")
    .replace(/^M\.?\s*2\s*[- ]?SATA$/i, "M.2 SATA")
    .replace(/^M\.?\s*2$/i, "M.2")
    .replace(/^SATA\s*([0-9.]+)?$/i, (_, version = "") =>
      version ? `SATA ${version}` : "SATA",
    )
    .replace(/^DDR(\d+)(?:UDIMM|DIMM)?$/i, "DDR$1");
  const upper = value.toUpperCase();
  if (upper === "M.2 NVME") return "M.2 NVMe";
  if (upper === "M.2 SATA") return "M.2 SATA";
  return value;
}

export function canonicalSpecValue(key: string, input: string): string {
  if (key === "Memory type")
    return normalizeSpecValue(key, input)
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .join(",");
  if (key === "Socket") return input.trim().toUpperCase().replace(/\s+/g, "");
  if (key === "SSD type")
    return normalizeSpecValue(key, input)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .join(",");
  return normalizeSpecValue(key, input).toLowerCase();
}

export function specMatches(
  key: string,
  actual: string | undefined,
  expected: string | undefined,
): boolean {
  if (!actual || !expected) return false;
  const values = actual
    .split(/[,;|\n]+/)
    .map((item) => canonicalSpecValue(key, item));
  return values.includes(canonicalSpecValue(key, expected));
}
export function normalizeSpecs(spec: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(spec).map(([key, value]) => [
      key,
      normalizeSpecValue(key, value),
    ]),
  );
}

/** Split an editable spec into selectable values while accepting common separators. */
export function specOptions(
  value: string | undefined,
  fallback: string[] = [],
): string[] {
  const values = (value ?? "")
    .split(/[,;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = [...new Set(values)];
  return unique.length ? unique : [...new Set(fallback)];
}
/** Return a number in the requested unit only when the complete value is parseable. */
export function specNumber(
  key: string,
  value: string | undefined,
  unit?: string,
): number | undefined {
  if (!value) return undefined;
  const match = normalizeSpecValue(key, value).match(
    /^(\d+(?:\.\d+)?)\s*([a-z/]+)?$/i,
  );
  if (!match) return undefined;
  const n = Number(match[1]);
  const actual = match[2]?.toLowerCase();
  if (!unit || !actual || actual === unit.toLowerCase()) return n;
  if (unit === "GB" && actual === "tb") return n * 1000;
  if (unit === "GHz" && actual === "mhz") return n / 1000;
  if (unit === "W" && actual === "kw") return n * 1000;
  return undefined;
}
