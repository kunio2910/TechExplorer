import { createRequire } from "node:module";
const { load } = createRequire(
  new URL("../functions/package.json", import.meta.url),
)("cheerio");
import { officialUrl } from "../functions/extract.js";

export const vendorProfiles = {
  MSI: {
    suffixes: ["/Specification"],
    hosts: ["www.msi.com", "us.msi.com", "vn.msi.com", "uk.msi.com"],
  },
  ASUS: { suffixes: ["/techspec/", "/spec/"], hosts: [] },
  GIGABYTE: { suffixes: ["/sp"], hosts: [] },
  ASRock: { suffixes: ["#Specification"], hosts: [] },
};

export function specificationLinks(html, sourceUrl) {
  const original = officialUrl(sourceUrl);
  const $ = load(html);
  const links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (
      !/specification|techspec|tech-spec|thông số|specs?\b/i.test(
        `${$(el).text()} ${href}`,
      )
    )
      return;
    try {
      const target = officialUrl(new URL(href, original.url).href);
      // Follow product tabs, never related products or another manufacturer.
      const stem = original.url.pathname
        .replace(/\/(?:specification|techspec|spec|sp)\/?$/i, "")
        .replace(/\/$/, "")
        .toLowerCase();
      const path = target.url.pathname.toLowerCase();
      if (
        target.brand === original.brand &&
        (path === stem || path.startsWith(stem + "/"))
      )
        links.push(target.url.href);
    } catch {}
  });
  return [...new Set(links)].slice(0, 4);
}

export function configuredCandidates(original) {
  const { brand } = officialUrl(original.href);
  const profile = vendorProfiles[brand];
  const result = [original.href];
  if (!profile) return result;
  const stem = original.pathname
    .replace(/\/(?:specification|techspec|spec|sp)\/?$/i, "")
    .replace(/\/$/, "");
  for (const host of [...new Set([original.hostname, ...profile.hosts])]) {
    for (const suffix of profile.suffixes) {
      const url = new URL(original.href);
      url.hostname = host;
      url.search = "";
      url.hash = "";
      if (suffix.startsWith("#")) {
        url.pathname = stem;
        url.hash = suffix;
      } else url.pathname = stem + suffix;
      result.push(url.href);
    }
  }
  return [...new Set(result)];
}
