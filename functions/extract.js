import { load } from "cheerio";

export const brands = {
  "asus.com": "ASUS",
  "msi.com": "MSI",
  "gigabyte.com": "GIGABYTE",
  "asrock.com": "ASRock",
  "intel.com": "Intel",
  "amd.com": "AMD",
  "corsair.com": "Corsair",
  "kingston.com": "Kingston",
  "crucial.com": "Crucial",
  "samsung.com": "Samsung",
  "seasonic.com": "Seasonic",
  "coolermaster.com": "Cooler Master",
};
export function officialUrl(input) {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw new Error("Chỉ hỗ trợ URL HTTPS chính hãng.");
  const domain = Object.keys(brands).find(
    (d) => url.hostname === d || url.hostname.endsWith(`.${d}`),
  );
  if (!domain)
    throw new Error(
      "Nguồn chưa được hỗ trợ. Dùng link ASUS, MSI, GIGABYTE, ASRock, Intel, AMD, Corsair, Kingston, Crucial, Samsung, Seasonic hoặc Cooler Master.",
    );
  return { url, brand: brands[domain] };
}
const rules = {
  Mainboard: {
    Socket: /^(?:cpu socket|socket|socket cpu)$/i,
    "Memory type": /^(?:memory type|memory technology|loại ram)$/i,
    Chipset: /^chipset$/i,
    "Form factor": /^form factor$/i,
    "Max memory": /^(?:max(?:imum)? memory|maximum memory capacity)$/i,
    "Memory slots": /^(?:memory slots|dimm slots)$/i,
    "M.2 slots": /^(?:m\.2 slots|m\.2 connectors)$/i,
    SATA: /^(?:sata|sata ports|sata connectors)$/i,
    "SSD type": /^(?:ssd type|storage interface)$/i,
  },
  CPU: {
    Socket: /^(?:socket|cpu socket|sockets supported|cpu socket type)$/i,
    Cores: /^(?:total cores|number of cpu cores|cores|# of cpu cores)$/i,
    Threads: /^(?:total threads|threads|# of threads|number of threads)$/i,
    "Boost clock": /^(?:max turbo frequency|max boost clock|boost clock)$/i,
    TDP: /^(?:tdp|default tdp|processor base power)$/i,
  },
  RAM: {
    "Memory type": /^(?:memory type|memory technology)$/i,
    Capacity: /^(?:capacity|memory size|memory capacity)$/i,
    Speed: /^(?:speed|memory speed|tested speed)$/i,
    Modules: /^(?:modules|kit configuration|package memory format)$/i,
  },
  SSD: {
    Capacity: /^(?:capacity|storage capacity)$/i,
    Interface: /^(?:interface|storage interface)$/i,
    "Form factor": /^form factor$/i,
    "Read speed": /^(?:sequential read|sequential read speed|read speed)$/i,
    "Write speed": /^(?:sequential write|sequential write speed|write speed)$/i,
  },
  GPU: {
    VRAM: /^(?:memory size|video memory|memory capacity)$/i,
    "Memory type": /^memory type$/i,
    "Boost clock": /^(?:boost clock|engine clock)$/i,
    TDP: /^(?:power consumption|graphics card power|tdp)$/i,
    "Recommended PSU": /^(?:recommended psu|recommended power supply)$/i,
  },
  PSU: {
    Wattage: /^(?:wattage|total power|power output|rated output power)$/i,
    Efficiency: /^(?:efficiency|80 plus rating|80 plus efficiency)$/i,
    Modular: /^(?:modular|cable type|modularity)$/i,
    "Form factor": /^form factor$/i,
  },
};
export function extractProduct(html, sourceUrl, type) {
  const { brand } = officialUrl(sourceUrl);
  if (!rules[type]) throw new Error("Loại linh kiện không hợp lệ.");
  const $ = load(html);
  const clean = (value) =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1800);
  const pairs = [];
  const products = [];
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if ([value["@type"]].flat().includes("Product")) products.push(value);
    for (const entry of Object.values(value)) {
      if (Array.isArray(entry)) entry.forEach(walk);
      else if (entry && typeof entry === "object") walk(entry);
    }
  }
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      walk(JSON.parse($(el).text()));
    } catch {}
  });
  const product = products[0] ?? {};
  for (const prop of [product.additionalProperty ?? []].flat())
    if (prop?.name && prop?.value != null)
      pairs.push([prop.name, String(prop.value)]);
  $("tr").each((_, el) => {
    const cells = $(el).children("th,td");
    if (cells.length === 2)
      pairs.push([cells.eq(0).text(), cells.eq(1).text()]);
  });
  $("dt").each((_, el) => {
    const dd = $(el).next("dd");
    if (dd.length) pairs.push([$(el).text(), dd.text()]);
  });
  // Common vendor spec rows with a distinct label and value.
  $(".spec-item, .specification-item, .techspec-item").each((_, el) => {
    const key = $(el).find(".label, .name, .title, .spec-title").first();
    const value = $(el).find(".value, .content, .spec-content").first();
    if (key.length && value.length) pairs.push([key.text(), value.text()]);
  });
  const fields = [];
  const add = (key, value) => {
    value = clean(value);
    if (value && !fields.some((f) => f.key === key))
      fields.push({ key, value });
  };
  add(
    "name",
    product.name ||
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text(),
  );
  add(
    "brand",
    typeof product.brand === "object"
      ? product.brand.name
      : product.brand || brand,
  );
  add("model", product.model || product.mpn);
  add(
    "description",
    product.description || $('meta[name="description"]').attr("content"),
  );
  for (const [key, value] of pairs)
    for (const [field, pattern] of Object.entries(rules[type]))
      if (pattern.test(clean(key).replace(/\s*:\s*$/, "")))
        add(`spec.${field}`, value);
  const images = [];
  for (const entry of [
    product.image ?? [],
    $('meta[property="og:image"]').attr("content"),
  ].flat()) {
    try {
      if (
        !entry ||
        (typeof entry !== "string" && typeof entry?.url !== "string")
      )
        continue;
      const url = new URL(
        typeof entry === "object" ? entry.url : entry,
        sourceUrl,
      );
      if (url.protocol === "https:" && !images.includes(url.href))
        images.push(url.href);
    } catch {}
  }
  return {
    type,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    fields,
    images: images.slice(0, 12),
    missing: Object.keys(rules[type]).filter(
      (key) => !fields.some((f) => f.key === `spec.${key}`),
    ),
    warnings: fields.filter((f) => f.key.startsWith("spec.")).length
      ? []
      : [
          "Trang chưa cung cấp bảng thông số có thể đọc. Chỉ lấy được thông tin cơ bản; hãy thử link trang thông số kỹ thuật của sản phẩm.",
        ],
  };
}
