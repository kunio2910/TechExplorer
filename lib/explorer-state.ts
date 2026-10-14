export type ExplorerScreen =
  "home" | "explorer" | "components" | "builder" | "saved" | "learn";
export type ExplorerState = {
  screen: ExplorerScreen;
  device?: string;
  component?: string;
  category: string;
  tab: string;
  hotspot?: string;
  view: string;
  query: string;
  filters?: Record<string, string>;
};
export function parseExplorerState(
  url: URL,
  initialSlug?: string,
): ExplorerState {
  const p = url.searchParams;
  const device = p.get("device") || initialSlug;
  const component = p.get("component") || undefined;
  const raw = p.get("screen");
  let filters: Record<string, string> = {};
  try {
    const rawFilters = JSON.parse(p.get("filters") ?? "{}");
    if (
      rawFilters &&
      typeof rawFilters === "object" &&
      !Array.isArray(rawFilters)
    )
      filters = Object.fromEntries(
        Object.entries(rawFilters).filter(
          (entry): entry is [string, string] => {
            const [key, value] = entry;
            return (
              [
                "brand",
                "Socket",
                "Memory type",
                "Capacity",
                "Wattage",
              ].includes(key) &&
              typeof value === "string" &&
              value.length < 150
            );
          },
        ),
      );
  } catch {
    /* Invalid filter parameters leave the library unfiltered. */
  }
  const screen = [
    "home",
    "explorer",
    "components",
    "builder",
    "saved",
    "learn",
  ].includes(raw ?? "")
    ? (raw as ExplorerScreen)
    : device
      ? "explorer"
      : component
        ? "components"
        : "home";
  return {
    screen,
    device,
    component,
    category: p.get("category") ?? (device ? "Mainboard" : ""),
    tab: ["Overview", "Specifications", "Compatibility"].includes(
      p.get("tab") ?? "",
    )
      ? p.get("tab")!
      : "Overview",
    hotspot: p.get("hotspot") || undefined,
    view: ["top", "signal", "rear_io", "xray", "exploded"].includes(
      p.get("view") ?? "",
    )
      ? p.get("view")!
      : "top",
    query: p.get("q") ?? "",
    filters,
  };
}
export function explorerUrl(state: ExplorerState, basePath: string): string {
  const p = new URLSearchParams();
  if (state.screen !== "home") p.set("screen", state.screen);
  if (state.screen === "explorer" && state.device)
    p.set("device", state.device);
  if (state.screen === "components" && state.component)
    p.set("component", state.component);
  if (["components", "explorer"].includes(state.screen) && state.category)
    p.set("category", state.category);
  if (
    ["explorer", "components"].includes(state.screen) &&
    state.tab !== "Overview"
  )
    p.set("tab", state.tab);
  if (state.screen === "explorer" && state.hotspot)
    p.set("hotspot", state.hotspot);
  if (state.screen === "explorer" && state.view !== "top")
    p.set("view", state.view);
  if (state.query) p.set("q", state.query);
  if (
    state.screen === "components" &&
    state.filters &&
    Object.values(state.filters).some(Boolean)
  )
    p.set("filters", JSON.stringify(state.filters));
  return `${basePath}/${p.size ? `?${p}` : ""}`;
}
