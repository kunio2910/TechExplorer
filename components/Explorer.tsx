"use client";
import { assetUrl, basePath } from "@/lib/runtime";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { categoryLabel } from "@/lib/labels";
import {
  Search,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Mouse,
  Network,
  Fan,
  Zap,
  LoaderCircle,
  ChevronRight,
  Box,
  Layers,
  ScanLine,
  Workflow,
  Plug,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  PackageOpen,
  SlidersHorizontal,
  MousePointer2,
  Menu,
} from "lucide-react";
import { AssociatedComponent, CatalogComponent, Product } from "@/lib/types";
import DeviceCanvas from "./DeviceCanvas";
import DetailPanel from "./DetailPanel";
import ComponentCanvas from "./ComponentCanvas";
import ComponentDetailPanel from "./ComponentDetailPanel";
import CatalogCard from "./CatalogCard";
import CatalogFilters from "./CatalogFilters";
import DeviceComparison from "./DeviceComparison";
import PcBuilder from "./PcBuilder";
import KnowledgeCenter from "./KnowledgeCenter";
import usePersonalLibrary, { deviceKey } from "./usePersonalLibrary";
import { linkedProduct } from "@/lib/linked-components";
import { localizeDevice } from "@/lib/vietnamese";
import { normalizeSpecs } from "@/lib/spec-units";
import {
  explorerUrl,
  parseExplorerState,
  type ExplorerScreen,
} from "@/lib/explorer-state";
import {
  filterDevices,
  deviceType,
  specLabel,
  type Device,
} from "@/lib/catalog-tools";
const categories = [
  ["Mainboard", Cpu],
  ["CPU", Cpu],
  ["GPU", Monitor],
  ["RAM", MemoryStick],
  ["SSD", HardDrive],
  ["Power Supply", Zap],
  ["Cooling", Fan],
  ["Laptop", Monitor],
  ["Peripherals", Mouse],
  ["Networking", Network],
] as const;
const modes = [
  {
    id: "top",
    title: "Khám phá 2D",
    description: "Kết nối từng linh kiện.",
    icon: Box,
  },
  {
    id: "exploded",
    title: "Cấu trúc tách lớp",
    description: "Xem cấu tạo bên trong.",
    icon: Layers,
  },
  {
    id: "xray",
    title: "Góc nhìn xuyên lớp",
    description: "Khám phá bên dưới bề mặt.",
    icon: ScanLine,
  },
  {
    id: "signal",
    title: "Luồng tín hiệu",
    description: "Theo dõi đường truyền dữ liệu.",
    icon: Workflow,
  },
  {
    id: "rear_io",
    title: "Cổng kết nối phía sau",
    description: "Khám phá các cổng kết nối.",
    icon: Plug,
  },
  {
    id: "compatibility",
    title: "Tương thích",
    description: "Kiểm tra trước khi lắp máy.",
    icon: ShieldCheck,
  },
];
const categoryAliases: Record<string, string[]> = {
  SSD: ["Storage", "SSD", "Storage (SSD)"],
  "Power Supply": ["PSU", "Power Supply"],
  Cooling: ["Cooling"],
  Laptop: ["Laptop"],
  Peripherals: ["Peripherals"],
  Networking: ["Networking"],
};
const catalogTypeByCategory: Record<string, CatalogComponent["type"]> = {
  CPU: "CPU",
  RAM: "RAM",
  SSD: "SSD",
  GPU: "GPU",
  "Power Supply": "PSU",
};
const quickStartSteps = [
  ["01", "Chọn danh mục", "Chọn loại linh kiện bạn muốn khám phá", Box],
  ["02", "Chọn thiết bị", "Duyệt và chọn một thiết bị cụ thể", MousePointer2],
  [
    "03",
    "Xem ảnh và thông số",
    "Khám phá cấu tạo và thông số kỹ thuật",
    PackageOpen,
  ],
] as const;

function categoryIcon(name: string) {
  if (name === "GPU") return Monitor;
  if (name === "RAM") return MemoryStick;
  if (name === "SSD") return HardDrive;
  if (name === "Power Supply") return Zap;
  if (name === "Cooling") return Fan;
  if (name === "Peripherals") return Mouse;
  if (name === "Networking") return Network;
  return Cpu;
}

function componentTypeForCategory(
  category: AssociatedComponent["category"],
): CatalogComponent["type"] | null {
  if (
    category === "CPU" ||
    category === "RAM" ||
    category === "GPU" ||
    category === "PSU"
  ) {
    return category;
  }
  if (category === "Storage") return "SSD";
  return null;
}

function seedCatalogComponents(products: Product[]): CatalogComponent[] {
  const unique = new Map<string, CatalogComponent>();
  products.forEach((product) => {
    product.components.forEach((item) => {
      const type = componentTypeForCategory(item.category);
      if (!type || unique.has(item.id)) return;
      unique.set(item.id, {
        ...item,
        type,
        brand: "",
        imageUrl: "",
        gallery: [],
        description: item.notes,
        spec: {},
        status: "published",
      });
    });
  });
  return [...unique.values()];
}
export default function Explorer({
  products,
  initialSlug,
}: {
  products: Product[];
  initialSlug?: string;
}) {
  const technologyDialog = useRef<HTMLDialogElement>(null);
  const [catalog, setCatalog] = useState(() =>
    products.map((item) =>
      localizeDevice({ ...item, spec: normalizeSpecs(item.spec) }),
    ),
  );
  const [selected, setSelected] = useState(initialSlug);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<ExplorerScreen>(
    initialSlug ? "explorer" : "home",
  );
  const [activeCategory, setActiveCategory] = useState(
    initialSlug ? "Mainboard" : "",
  );
  const [catalogComponents, setCatalogComponents] = useState<
    CatalogComponent[]
  >(() => seedCatalogComponents(products.map(localizeDevice)));
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );
  const [view, setView] = useState("top");
  const [tab, setTab] = useState("Overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [pendingBuildItem, setPendingBuildItem] = useState<Device | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const personal = usePersonalLibrary();
  const [personalTab, setPersonalTab] = useState("favorites");
  const [routeReady, setRouteReady] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const lastRoute = useRef("");
  const route = {
    screen: workspaceMode,
    device: selected,
    component: selectedComponentId ?? undefined,
    category: activeCategory,
    tab,
    hotspot: active ?? undefined,
    view,
    query,
    filters,
  };
  useEffect(() => {
    const restore = () => {
      const url = new URL(location.href);
      const pathSlug = url.pathname.includes("/explore/")
        ? url.pathname.split("/").filter(Boolean).at(-1)
        : undefined;
      const state = parseExplorerState(url, pathSlug);
      lastRoute.current = explorerUrl(state, basePath);
      setWorkspaceMode(state.screen);
      setSelected(state.device);
      setSelectedComponentId(state.component ?? null);
      setActiveCategory(state.category);
      setActive(state.hotspot ?? null);
      setView(state.view);
      setTab(state.tab);
      setQuery(state.query);
      setFilters(state.filters ?? {});
      setRouteReady(true);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => {
    if (!routeReady) return;
    const url = explorerUrl(route, basePath);
    if (url === lastRoute.current) return;
    const previous = new URL(lastRoute.current, location.origin);
    // Navigation is reversible; typing into search only updates the current entry.
    const next = new URL(url, location.origin);
    const withoutQuery = (u: URL) => {
      u.searchParams.delete("q");
      return u.search;
    };
    if (withoutQuery(previous) === withoutQuery(next))
      history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    lastRoute.current = url;
  }, [
    workspaceMode,
    selected,
    selectedComponentId,
    activeCategory,
    tab,
    active,
    view,
    query,
    filters,
    routeReady,
  ]);
  const [comparison, setComparison] = useState<Device[]>([]);
  useEffect(() => {
    setComparison((current) =>
      current.flatMap((item) => {
        const latest = [...catalog, ...catalogComponents].find(
          (x) => x.id === item.id && deviceType(x) === deviceType(item),
        );
        return latest ? [latest] : [];
      }),
    );
  }, [catalog, catalogComponents]);
  const browseScroll = useRef(0);
  function toggleComparison(item: Device) {
    if (comparison.some((i) => i.id === item.id)) {
      setComparison((current) => current.filter((i) => i.id !== item.id));
      return;
    }
    if (comparison.length && deviceType(comparison[0]) !== deviceType(item)) {
      setNotice(
        "Chỉ so sánh các thiết bị cùng loại. Hãy bỏ lựa chọn hiện tại để đổi loại.",
      );
      return;
    }
    if (comparison.length >= 4) {
      setNotice("Chọn tối đa 4 thiết bị để so sánh.");
      return;
    }
    setComparison((current) => [...current, item]);
  }
  function backToLibrary() {
    setWorkspaceMode("components");
    setSelectedComponentId(null);
    setActive(null);
    requestAnimationFrame(() => window.scrollTo(0, browseScroll.current));
  }
  useEffect(() => {
    let cancelled = false;
    let unsubscribeProducts = () => {};
    let unsubscribeComponents = () => {};
    let productsReady = false;
    let componentsReady = false;

    const markReady = (kind: "products" | "components") => {
      if (kind === "products") productsReady = true;
      else componentsReady = true;
      if (!cancelled && productsReady && componentsReady)
        setCatalogLoading(false);
    };

    async function connectRemoteCatalog() {
      try {
        const { subscribeToPublishedComponents, subscribeToPublishedProducts } =
          await import("@/lib/firestore");
        if (cancelled) return;

        unsubscribeProducts = subscribeToPublishedProducts(
          (remoteProducts) => {
            if (cancelled) return;
            setCatalog(
              remoteProducts.map((item) =>
                localizeDevice({ ...item, spec: normalizeSpecs(item.spec) }),
              ),
            );
            markReady("products");
          },
          () => {
            markReady("products");
            setNotice(
              "Không thể đồng bộ danh sách mainboard. Vui lòng kiểm tra kết nối và tải lại trang.",
            );
          },
        );
        unsubscribeComponents = subscribeToPublishedComponents(
          (remoteComponents) => {
            if (cancelled) return;
            setCatalogComponents(
              remoteComponents.map((item) =>
                localizeDevice({ ...item, spec: normalizeSpecs(item.spec) }),
              ),
            );
            markReady("components");
          },
          () => {
            markReady("components");
            setNotice(
              "Không thể đồng bộ danh sách linh kiện. Vui lòng kiểm tra kết nối và tải lại trang.",
            );
          },
        );
      } catch {
        setCatalogLoading(false);
        // Keep the bundled catalog available when Firestore is unavailable.
        try {
          const saved = JSON.parse(
            window.localStorage.getItem("tech-explorer-products-v1") ?? "[]",
          ) as Product[];
          if (!cancelled && Array.isArray(saved)) {
            const savedIds = new Set(saved.map((product) => product.id));
            setCatalog([
              ...products.filter((product) => !savedIds.has(product.id)),
              ...saved,
            ]);
          }
        } catch {
          // Ignore invalid browser-local content and keep the seed catalog.
        }
      }
    }

    void connectRemoteCatalog();
    return () => {
      cancelled = true;
      unsubscribeProducts();
      unsubscribeComponents();
    };
  }, [products]);
  const matches = useMemo(
    () =>
      catalog.filter((p) =>
        JSON.stringify([p.name, p.category, p.spec])
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [catalog, query],
  );
  const categoryProducts = useMemo(() => {
    const accepted = categoryAliases[activeCategory] ?? [activeCategory];
    return filterDevices(
      matches.filter((p) => accepted.includes(p.category)),
      filters,
    );
  }, [activeCategory, matches, filters]);
  const componentMatches = useMemo(() => {
    if (!catalogTypeByCategory[activeCategory]) {
      return [];
    }
    return filterDevices(
      catalogComponents.filter(
        (component) =>
          component.type === catalogTypeByCategory[activeCategory] &&
          JSON.stringify([
            component.name,
            component.brand,
            component.model,
            component.description,
            component.spec,
          ])
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
      filters,
    );
  }, [activeCategory, catalogComponents, query, filters]);
  const activeComponent = catalogComponents.find(
    (component) => component.id === selectedComponentId,
  );
  const isCatalogComponent = !!catalogTypeByCategory[activeCategory];
  const libraryCount = isCatalogComponent
    ? componentMatches.length
    : categoryProducts.length;
  // Keep the home screen truly unselected after a refresh. Falling back to the
  // first catalog item here made the central panel look like a random
  // mainboard even when no device was selected.
  const rawProduct = selected
    ? catalog.find((p) => p.slug === selected)
    : undefined;
  const product = rawProduct
    ? linkedProduct(rawProduct, catalogComponents)
    : undefined;
  const allDevices: Device[] = [...catalog, ...catalogComponents];
  const currentDevice =
    workspaceMode === "explorer"
      ? product
      : workspaceMode === "components"
        ? activeComponent
        : undefined;
  useEffect(() => {
    if (personal.ready && currentDevice) personal.recordView(currentDevice);
  }, [
    personal.ready,
    currentDevice?.id,
    currentDevice && deviceType(currentDevice),
  ]);
  function openDevice(item: Device) {
    if ("media" in item) choose(item);
    else chooseComponent(item);
  }
  function addToBuilder(item: Device) {
    setPendingBuildItem(item);
    setWorkspaceMode("builder");
    setMobileMenu(false);
  }
  function reportDevice(item: Device) {
    const note = window.prompt(
      `Mô tả thông tin chưa đúng của “${item.name}”`,
      "",
    );
    if (!note?.trim()) return;
    try {
      const reports = JSON.parse(
        localStorage.getItem("tech-explorer-data-reports-v1") ?? "[]",
      );
      const next = Array.isArray(reports) ? reports : [];
      next.push({
        id: crypto.randomUUID(),
        deviceId: item.id,
        deviceType: deviceType(item),
        deviceName: item.name,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("tech-explorer-data-reports-v1", JSON.stringify(next));
      setNotice("Đã ghi nhận phản hồi. Cảm ơn bạn đã góp ý.");
    } catch {
      setNotice("Không thể lưu phản hồi trên trình duyệt này.");
    }
  }
  function openWorkspace(screen: ExplorerScreen) {
    setWorkspaceMode(screen);
    setMobileMenu(false);
  }
  const recentDevices = useMemo(
    () =>
      [...catalog, ...catalogComponents]
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
        .slice(0, 5),
    [catalog, catalogComponents],
  );
  function categoryCount(name: string) {
    if (name === "Mainboard") return catalog.length;
    const type = catalogTypeByCategory[name];
    return type
      ? catalogComponents.filter((item) => item.type === type).length
      : 0;
  }
  const suggestionCategories = categories
    .slice(0, 6)
    .filter(([name]) => categoryCount(name) > 0);
  const componentSuggestions = suggestionCategories.length
    ? suggestionCategories
    : categories.slice(0, 6);
  function browseComponents() {
    setWorkspaceMode("components");
    setSelected(undefined);
    setActiveCategory("");
    setActive(null);
    setSelectedComponentId(null);
    setFilters({});
    setTab("Overview");
    setMobileMenu(false);
  }
  function browseCategory(name: string) {
    if (name !== activeCategory) setFilters({});
    setActiveCategory(name);
    setWorkspaceMode("components");
    setActive(null);
    setSelectedComponentId(null);
    setTab("Overview");
    setMobileMenu(false);
  }
  function browseBrand(brand: string, category: string) {
    browseCategory(category);
    setFilters(brand ? { brand } : {});
  }
  function choose(p: Product) {
    browseScroll.current = window.scrollY;
    setActiveCategory(p.category);
    setSelected(p.slug);
    setWorkspaceMode("explorer");
    setActive(null);
    setSelectedComponentId(null);
    setView("top");
    setTab("Overview");
    setMobileMenu(false);
  }
  function chooseComponent(component: CatalogComponent) {
    browseScroll.current = window.scrollY;
    setActiveCategory(
      component.type === "PSU" ? "Power Supply" : component.type,
    );
    setSelectedComponentId(component.id);
    setWorkspaceMode("components");
    setActive(null);
    setTab("Overview");
    setMobileMenu(false);
  }
  function returnToHome() {
    setWorkspaceMode("home");
    setSelected(undefined);
    setActiveCategory("");
    setActive(null);
    setSelectedComponentId(null);
    setFilters({});
    setMobileMenu(false);
  }
  return (
    <div className="app-shell">
      {workspaceMode === "home" && catalogLoading && (
        <div className="catalog-loading-overlay" role="status" aria-live="polite">
          <div className="catalog-loading-card">
            <LoaderCircle className="catalog-loading-icon" size={48} aria-hidden="true" />
            <span>Đang tải dữ liệu thiết bị…</span>
          </div>
        </div>
      )}
      <dialog ref={technologyDialog} className="info-dialog">
        <div className="section-heading">
          <h2>Kết nối công nghệ</h2>
          <button onClick={() => technologyDialog.current?.close()}>
            Đóng
          </button>
        </div>
        <div className="technology-topic-grid">
          {[
            ["Hotspot tương tác", "Chọn vòng tròn trên ảnh để xem vị trí và vai trò của từng khu vực."],
            ["Chuẩn hóa thông số", "Các đơn vị GB, W, GHz và chuẩn DDR được hiển thị theo cách thống nhất để dễ so sánh."],
            ["Liên kết linh kiện", "Linh kiện đi kèm được nối với thư viện sản phẩm để mở nhanh thông số và đưa vào cấu hình."],
            ["Kiểm tra tương thích", "Socket CPU, chuẩn RAM, loại SSD và công suất nguồn được đối chiếu trước khi lắp máy."],
          ].map(([title, text]) => (
            <section key={title} className="technology-topic">
              <span className="eyebrow">TECH EXPLORER</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
        </div>
      </dialog>
      <header className="header">
        <Link href="/" className="logo">
          <span className="logo-mark">
            T<span>↗</span>
          </span>
          <span>
            TECH
            <br />
            EXPLORER<small>KHÁM PHÁ CÔNG NGHỆ</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <button
            className={
              workspaceMode === "explorer" || workspaceMode === "home"
                ? "nav-active"
                : ""
            }
            onClick={() => {
              returnToHome();
              setView("top");
              setTab("Overview");
            }}
          >
            Khám phá
          </button>
          <button
            className={workspaceMode === "components" ? "nav-active" : ""}
            onClick={browseComponents}
          >
            Linh kiện
          </button>
          <button
            className={workspaceMode === "builder" ? "nav-active" : ""}
            onClick={() => openWorkspace("builder")}
          >
            Xây dựng cấu hình
          </button>
          <button
            onClick={() => {
              setComparisonOpen(true);
            }}
          >
            So sánh
          </button>
          <button
            className={workspaceMode === "learn" ? "nav-active" : ""}
            onClick={() => openWorkspace("learn")}
          >
            Tìm hiểu
          </button>
          <button onClick={() => technologyDialog.current?.showModal()}>
            Công nghệ
          </button>
          <button
            className={workspaceMode === "saved" ? "nav-active" : ""}
            onClick={() => openWorkspace("saved")}
          >
            Đã lưu
          </button>
        </nav>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Tìm thiết bị"
            placeholder="Tìm tên, chipset, socket…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Link href="/admin" className="admin-link">
          Quản trị <ArrowUpRight size={13} />
        </Link>
        <button
          className="mobile-menu icon-button"
          aria-label="Mở menu linh kiện"
          onClick={() => setMobileMenu((v) => !v)}
        >
          <Menu size={20} />
        </button>
      </header>
      <div className="workspace-feature-bar">
        <div className="feature-mobile-nav">
          <button onClick={browseComponents}>Linh kiện</button>
          <button onClick={() => openWorkspace("builder")}>Cấu hình PC</button>
          <button onClick={() => openWorkspace("learn")}>Kiến thức</button>
          <button onClick={() => openWorkspace("saved")}>Đã lưu</button>
        </div>
        {personal.storageError && <p role="status">{personal.storageError}</p>}
      </div>
      <div className="workspace">
        <aside
          className={
            "sidebar " +
            (mobileMenu ? "visible " : "") +
            (workspaceMode === "home" ? "home-sidebar" : "")
          }
        >
          {workspaceMode === "components" &&
            activeCategory &&
            !activeComponent && (
              <CatalogFilters
                items={
                  catalogTypeByCategory[activeCategory]
                    ? catalogComponents.filter(
                        (c) => c.type === catalogTypeByCategory[activeCategory],
                      )
                    : catalog.filter((p) => p.category === activeCategory)
                }
                value={filters}
                onChange={setFilters}
              />
            )}
          <div className="sidebar-section">
            <div className="section-heading">
              <span className="eyebrow">LINH KIỆN</span>
              <span className="tiny">
                {workspaceMode === "home" ? 6 : categories.length}
              </span>
            </div>
            {categories
              .slice(0, workspaceMode === "home" ? 6 : categories.length)
              .map(([name, Icon]) => (
                <button
                  key={name}
                  className={
                    "category " + (activeCategory === name ? "selected" : "")
                  }
                  onClick={() => browseCategory(name)}
                >
                  <Icon size={20} />
                  <span>{categoryLabel(name)}</span>
                  <ChevronRight size={14} />
                </button>
              ))}
          </div>
          {workspaceMode === "explorer" && (
            <div className="sidebar-section models">
              <div className="section-heading">
                <span className="eyebrow">KHÁM PHÁ THIẾT BỊ</span>
                <span className="tiny">{matches.length}</span>
              </div>
              {matches.map((p) => (
                <button
                  key={p.id}
                  className={
                    "model " + (product?.id === p.id ? "selected" : "")
                  }
                  onClick={() => choose(p)}
                >
                  <img
                    src={assetUrl(p.media.main)}
                    alt=""
                    width={34}
                    height={46}
                    loading="lazy"
                  />
                  <span>
                    {p.name}
                    <small>
                      {p.brand} · {p.spec.Socket}
                    </small>
                  </span>
                </button>
              ))}
              {matches.length === 0 && (
                <p className="muted">Không có thiết bị phù hợp “{query}”.</p>
              )}
            </div>
          )}
          <div className="sidebar-note">
            <span className="live-dot" /> KẾT NỐI TRI THỨC
            <p>
              Hiểu rõ phần cứng của bạn.
              <br />
              Chọn cấu hình phù hợp với nhu cầu.
            </p>
          </div>
        </aside>
        {workspaceMode === "home" ? (
          <>
            <main className="explorer-main home-landing">
              <div className="breadcrumb">
                <span>Tech Explorer</span> <ChevronRight size={11} /> Trang chủ
              </div>
              <section className="home-empty-state">
                <div className="home-empty-visual">
                  <img
                    className="home-hero-image"
                    src={assetUrl("/media/explorer-home-empty.svg")}
                    alt="Minh họa trung tâm khám phá phần cứng"
                    width={1200}
                    height={720}
                  />
                  <div className="home-empty-copy">
                    <p>Chọn một danh mục hoặc tìm kiếm để bắt đầu</p>
                    <button className="home-cta" onClick={browseComponents}>
                      <MousePointer2 size={16} /> Bắt đầu khám phá
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </section>
              <div className="explorer-footer">
                <span>
                  <i className="live-dot" /> HỆ THỐNG SẴN SÀNG
                </span>
                <span>CHỌN DANH MỤC ĐỂ BẮT ĐẦU</span>
              </div>
            </main>
            <aside className="home-start-panel">
              <section className="home-quick-start">
                <div className="home-panel-heading">
                  <h2>
                    <Zap size={18} /> BẮT ĐẦU NHANH
                  </h2>
                </div>
                <div className="home-quick-steps">
                  {quickStartSteps.map(([number, title, description, Icon]) => (
                    <div className="home-quick-step" key={number}>
                      <span className="home-step-number">{number}</span>
                      <div>
                        <strong>{title}</strong>
                        <p>{description}</p>
                      </div>
                      <span className="home-step-icon">
                        <Icon size={18} />
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="home-latest-panel">
                <div className="home-panel-heading">
                  <h2>
                    <Network size={18} /> Thiết bị mới cập nhật
                  </h2>
                  <button onClick={browseComponents}>
                    Xem tất cả <ArrowRight size={13} />
                  </button>
                </div>
                <div className="home-latest-list">
                  {recentDevices.length ? (
                    recentDevices.map((item) => {
                      const type =
                        "media" in item
                          ? item.category
                          : item.type === "PSU"
                            ? "Power Supply"
                            : item.type;
                      const Icon = categoryIcon(type);
                      return (
                        <button
                          className="home-latest-row"
                          key={item.id}
                          onClick={() =>
                            "media" in item
                              ? choose(item)
                              : chooseComponent(item)
                          }
                        >
                          <span className="home-latest-icon">
                            <Icon size={18} />
                          </span>
                          <span className="home-latest-name">
                            <strong>{item.name}</strong>
                            <small>{categoryLabel(type)}</small>
                          </span>
                          <time>
                            {item.updatedAt
                              ? new Date(item.updatedAt).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "Mới cập nhật"}
                          </time>
                        </button>
                      );
                    })
                  ) : (
                    <p className="muted">Chưa có thiết bị được cập nhật.</p>
                  )}
                </div>
              </section>
            </aside>
          </>
        ) : workspaceMode === "builder" ? (
          <PcBuilder
            devices={allDevices}
            onOpen={openDevice}
            onNotice={setNotice}
            initialItem={pendingBuildItem}
            onInitialItemConsumed={() => setPendingBuildItem(null)}
          />
        ) : workspaceMode === "learn" ? (
          <KnowledgeCenter />
        ) : workspaceMode === "saved" ? (
          <main className="feature-workspace">
            <span className="eyebrow">THƯ VIỆN CÁ NHÂN</span>
            <h1>Thiết bị của bạn</h1>
            <p>Yêu thích và lịch sử được lưu trên trình duyệt này.</p>
            <div className="feature-toolbar">
              <button
                aria-pressed={personalTab === "favorites"}
                onClick={() => setPersonalTab("favorites")}
              >
                Yêu thích
              </button>
              <button
                aria-pressed={personalTab === "recent"}
                onClick={() => setPersonalTab("recent")}
              >
                Đã xem gần đây
              </button>
              {personalTab === "recent" && (
                <button
                  onClick={() => {
                    if (confirm("Xóa lịch sử đã xem trên trình duyệt này?"))
                      personal.clearHistory();
                  }}
                >
                  Xóa lịch sử
                </button>
              )}
            </div>
            <div className="device-grid">
              {(personalTab === "favorites"
                ? personal.library.favorites
                : personal.library.recent.map((x) => x.key)
              ).map((key) => {
                const item = allDevices.find((x) => deviceKey(x) === key);
                return item ? (
                  <CatalogCard
                    key={key}
                    item={item}
                    onOpen={() => openDevice(item)}
                    onFavorite={() => personal.toggleFavorite(item)}
                    favorite={personal.library.favorites.includes(key)}
                  />
                ) : (
                  <article className="feature-card" key={key}>
                    <p>Thiết bị không còn được xuất bản.</p>
                    {personalTab === "favorites" && (
                      <button onClick={() => personal.removeFavorite(key)}>
                        Bỏ yêu thích
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            {!(
              personalTab === "favorites"
                ? personal.library.favorites
                : personal.library.recent
            ).length && <p>Chưa có thiết bị trong danh sách này.</p>}
          </main>
        ) : workspaceMode === "components" ? (
          !activeCategory ? (
            <>
              <main className="component-browser component-welcome">
                <div className="breadcrumb">
                  <span>Tech Explorer</span> <ChevronRight size={11} /> Linh
                  kiện
                </div>
                <section className="component-welcome-card">
                  <div className="component-welcome-heading">
                    <div>
                      <span className="eyebrow">THƯ VIỆN LINH KIỆN</span>
                      <h1>Chọn linh kiện để bắt đầu</h1>
                      <p>
                        Chọn một danh mục bên dưới để xem thiết bị, hình ảnh và
                        thông số kỹ thuật.
                      </p>
                    </div>
                    <span className="catalog-status">
                      <i className="live-dot" /> SẴN SÀNG KHÁM PHÁ
                    </span>
                  </div>
                  <div className="component-suggestion-grid">
                    {componentSuggestions.map(([name, Icon]) => (
                      <button
                        key={name}
                        className="component-suggestion-card"
                        onClick={() => browseCategory(name)}
                      >
                        <span className="component-suggestion-icon">
                          <Icon size={24} />
                        </span>
                        <span>
                          <strong>{categoryLabel(name)}</strong>
                          <small>Khám phá thiết bị</small>
                        </span>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </div>
                </section>
                <div className="explorer-footer">
                  <span>
                    <i className="live-dot" /> HỆ THỐNG SẴN SÀNG
                  </span>
                  <span>CHỌN DANH MỤC ĐỂ TIẾP TỤC</span>
                </div>
              </main>
              <aside className="detail-panel component-welcome-guide">
                <div className="panel-content">
                  <span className="eyebrow">HƯỚNG DẪN KHÁM PHÁ</span>
                  <div className="guide-icon">
                    <MousePointer2 size={22} />
                  </div>
                  <h2>Bắt đầu với một danh mục</h2>
                  <p>
                    Chọn một thẻ linh kiện ở giữa màn hình để xem danh sách
                    thiết bị đang có.
                  </p>
                  <ol className="guide-steps">
                    <li className="current">
                      <b>01</b>
                      <span>Chọn danh mục linh kiện</span>
                    </li>
                    <li>
                      <b>02</b>
                      <span>Chọn thẻ thiết bị</span>
                    </li>
                    <li>
                      <b>03</b>
                      <span>Khám phá hình ảnh và thông số</span>
                    </li>
                  </ol>
                </div>
              </aside>
            </>
          ) : isCatalogComponent && activeComponent ? (
            <>
              <main className="explorer-main component-review">
                <div className="breadcrumb">
                  <button type="button" onClick={browseComponents}>
                    Linh kiện
                  </button>
                  <ChevronRight size={11} />
                  <button
                    type="button"
                    onClick={() => browseCategory(activeCategory)}
                  >
                    {activeCategory}
                  </button>
                  <ChevronRight size={11} />
                  <button
                    type="button"
                    onClick={() =>
                      browseBrand(activeComponent.brand, activeCategory)
                    }
                  >
                    {activeComponent.brand}
                  </button>
                </div>
                <div className="title-row">
                  <div>
                    <h1>{activeComponent.name}</h1>
                  </div>
                </div>
                <ComponentCanvas
                  key={activeComponent.id}
                  component={activeComponent}
                  onCompare={() => toggleComparison(activeComponent)}
                  compareLabel={
                    comparison.some((i) => i.id === activeComponent.id)
                      ? "Bỏ khỏi so sánh"
                      : "＋ Thêm vào so sánh"
                  }
                />
                <div className="explorer-footer">
                  <span>
                    <i className="live-dot" /> HỆ THỐNG SẴN SÀNG
                  </span>
                  <span>XEM TRƯỚC HÌNH ẢNH LINH KIỆN</span>
                </div>
              </main>
              <ComponentDetailPanel
                component={activeComponent}
                tab={tab}
                setTab={setTab}
                onAddToBuild={() => addToBuilder(activeComponent)}
                onReport={() => reportDevice(activeComponent)}
              />
            </>
          ) : (
            <>
              <main className="component-browser">
                <div className="mobile-filters">
                  <CatalogFilters
                    items={
                      isCatalogComponent
                        ? catalogComponents.filter(
                            (c) =>
                              c.type === catalogTypeByCategory[activeCategory],
                          )
                        : catalog.filter((p) => p.category === activeCategory)
                    }
                    value={filters}
                    onChange={setFilters}
                  />
                </div>
                <div className="breadcrumb">
                  Linh kiện <ChevronRight size={11} />{" "}
                  <span>{activeCategory}</span>
                </div>
                <div className="browser-topline">
                  <span className="eyebrow">THƯ VIỆN LINH KIỆN</span>
                  <span className="tiny">
                    {libraryCount}{" "}
                    {libraryCount === 1 ? "THIẾT BỊ" : "THIẾT BỊ"}
                  </span>
                </div>
                <div className="browser-heading">
                  <div>
                    <h1>Khám phá {activeCategory}</h1>
                    <p>Chọn thiết bị để khám phá hình ảnh và thông số.</p>
                  </div>
                  <span className="catalog-status">
                    <i className="live-dot" /> DANH MỤC TRỰC TUYẾN
                  </span>
                </div>
                <div
                  className="category-pills"
                  aria-label="Component categories"
                >
                  {categories.slice(0, 6).map(([name]) => (
                    <button
                      key={name}
                      className={activeCategory === name ? "active" : ""}
                      onClick={() => browseCategory(name)}
                    >
                      {categoryLabel(name)}
                    </button>
                  ))}
                </div>
                {libraryCount > 0 ? (
                  <div className="device-grid">
                    {(isCatalogComponent
                      ? componentMatches
                      : categoryProducts
                    ).map((item) => (
                      <CatalogCard
                        key={item.id}
                        item={item}
                        onFavorite={() => personal.toggleFavorite(item)}
                        favorite={personal.library.favorites.includes(
                          deviceKey(item),
                        )}
                        onOpen={() =>
                          "media" in item ? choose(item) : chooseComponent(item)
                        }
                        onCompare={() => toggleComparison(item)}
                        selected={comparison.some((i) => i.id === item.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-browser">
                    <PackageOpen size={30} />
                    <span className="eyebrow">CHƯA CÓ THIẾT BỊ XUẤT BẢN</span>
                    <h2>{activeCategory} đang chờ bạn khám phá.</h2>
                    <p>
                      Xuất bản thiết bị trong trang quản trị để hiển thị trong
                      thư viện này.
                    </p>
                    <Link href="/admin">
                      Mở trang quản trị <ArrowUpRight size={14} />
                    </Link>
                  </div>
                )}
                <div className="explorer-footer">
                  <span>
                    <i className="live-dot" /> HỆ THỐNG SẴN SÀNG
                  </span>
                  <span>CHỌN THIẾT BỊ ĐỂ TIẾP TỤC</span>
                </div>
              </main>
              <aside className="detail-panel browse-guide">
                <div className="panel-content">
                  <div className="guide-header">
                    <span className="eyebrow">HƯỚNG DẪN KHÁM PHÁ</span>
                    <span className="tiny">01 / 03</span>
                  </div>
                  <div className="guide-icon">
                    <MousePointer2 size={22} />
                  </div>
                  <h2>Bắt đầu với một thiết bị</h2>
                  <p>
                    Duyệt thư viện ở giữa, sau đó chọn một thiết bị để xem chi
                    tiết.
                  </p>
                  <div className="guide-preview">
                    <span className="eyebrow">DANH MỤC HIỆN TẠI</span>
                    <strong>{activeCategory}</strong>
                    <span>
                      {libraryCount} đã xuất bản{" "}
                      {libraryCount === 1 ? "thiết bị" : "thiết bị"}
                    </span>
                  </div>
                  <ol className="guide-steps">
                    <li className="current">
                      <b>01</b>
                      <span>Chọn danh mục linh kiện</span>
                    </li>
                    <li>
                      <b>02</b>
                      <span>Chọn thẻ thiết bị</span>
                    </li>
                    <li>
                      <b>03</b>
                      <span>Khám phá hình ảnh và thông số</span>
                    </li>
                  </ol>
                  <div className="guide-tip">
                    <SlidersHorizontal size={16} />
                    <span>Gợi ý: tìm theo tên, chipset hoặc socket.</span>
                  </div>
                </div>
              </aside>
            </>
          )
        ) : product ? (
          <>
            <main className="explorer-main">
              <div className="breadcrumb">
                <button type="button" onClick={browseComponents}>
                  Linh kiện
                </button>
                <ChevronRight size={11} />
                <button type="button" onClick={() => browseCategory("Mainboard")}>
                  Mainboard
                </button>
                <ChevronRight size={11} />
                <button
                  type="button"
                  onClick={() => browseBrand(product.brand, "Mainboard")}
                >
                  {product.brand}
                </button>
              </div>
              <div className="title-row">
                <div>
                  <h1>{product.name}</h1>
                </div>
              </div>
              <DeviceCanvas
                key={product.id + view}
                product={product}
                active={active}
                view={view}
                expert={true}
                onSelect={(h) => {
                  setActive(h.id);
                  setTab("Overview");
                }}
                onCompare={() => toggleComparison(product)}
                compareLabel={
                  comparison.some((i) => i.id === product.id)
                    ? "Bỏ khỏi so sánh"
                    : "＋ Thêm vào so sánh"
                }
              />
              <div className="mode-heading">
                <span className="eyebrow">CHỌN GÓC NHÌN</span>
                <span className="tiny">CHẾ ĐỘ TƯƠNG TÁC</span>
              </div>
              <div className="view-switcher">
                {modes.map((m) => {
                  const available =
                    !["exploded", "xray", "rear_io"].includes(m.id) ||
                    !!product.media[m.id as "exploded" | "xray" | "rear_io"];
                  return (
                    <button
                      key={m.id}
                      disabled={!available}
                      className={
                        "view-card " +
                        (m.id === view ||
                        (m.id === "compatibility" && tab === "Compatibility")
                          ? "selected"
                          : "")
                      }
                      onClick={() => {
                        if (m.id === "compatibility") setTab("Compatibility");
                        else {
                          setView(m.id);
                          setActive(null);
                        }
                      }}
                    >
                      <m.icon size={22} />
                      <ChevronRight className="view-arrow" size={13} />
                      <b>{m.title}</b>
                      <small>
                        {available ? m.description : "Chưa có hình ảnh"}
                      </small>
                      <span className="mode-line" />
                    </button>
                  );
                })}
              </div>
              <div className="explorer-footer">
                <span>
                  <i className="live-dot" /> HỆ THỐNG SẴN SÀNG
                </span>
                <span>TƯƠNG TÁC 2D · KHÁM PHÁ PHẦN CỨNG</span>
              </div>
            </main>
            <DetailPanel
              product={product}
              onOpenLinked={(id) => {
                const item = catalogComponents.find((x) => x.id === id);
                if (item) chooseComponent(item);
              }}
              active={product.hotspots.find((h) => h.id === active)}
              tab={tab}
              setTab={setTab}
              onClose={() => setActive(null)}
              onAddToBuild={() => addToBuilder(product)}
              onReport={() => reportDevice(product)}
            />
          </>
        ) : (
          <main className="empty">
            <h1>Chưa có sản phẩm đã xuất bản</h1>
            <Link href="/admin">Tạo sản phẩm đầu tiên</Link>
          </main>
        )}
      </div>
      <DeviceComparison
        items={comparison}
        onRemove={(id) =>
          setComparison((current) => current.filter((item) => item.id !== id))
        }
        open={comparisonOpen}
        onOpen={() => setComparisonOpen(true)}
        onClose={() => setComparisonOpen(false)}
        onBrowse={() => browseComponents()}
      />
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
