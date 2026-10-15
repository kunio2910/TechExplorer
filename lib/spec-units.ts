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
};
export function normalizeSpecValue(key: string, input: string): string {
  let value = input.trim().replace(/\s+/g, " ");
  if (key === "Memory type" || key === "Socket")
    return value.toUpperCase().replace(/\s+/g, "");
  // Do not reinterpret Gb (network bit rates) as GB (capacity), or alter prose.
  if (!units[key]) return value;
  // Normalize decimal commas, but preserve unrecognized prose and numbers.
  if (/^\d+,\d{1,2}(\s*[a-z/]+)?$/i.test(value))
    value = value.replace(",", ".");
  value = value.replace(
    /(\d(?:[\d.]*\d)?)(\s*)(GiB|MiB|GB|TB|MB|kW|W|GHz|MHz|MT\/s|MB\/s|GB\/s|mm)\b/gi,
    (_, number: string, _space: string, unit: string) =>
      `${number} ${canonical[unit.toLowerCase()]}`,
  );
  if (/^\d+(?:\.\d+)?$/.test(value) && units[key]) value += ` ${units[key]}`;
  return value;
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
