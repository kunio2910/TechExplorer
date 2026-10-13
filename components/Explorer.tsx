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
  ["03", "Xem ảnh và thông số", "Khám phá cấu tạo và thông số kỹ thuật", PackageOpen],
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
  const [catalog, setCatalog] = useState(products);
  const [selected, setSelected] = useState(initialSlug);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<
    "home" | "explorer" | "components"
  >(initialSlug ? "explorer" : "home");
  const [activeCategory, setActiveCategory] = useState(
    initialSlug ? "Mainboard" : "",
  );
  const [catalogComponents, setCatalogComponents] = useState<
    CatalogComponent[]
  >(() => seedCatalogComponents(products));
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );
  const [view, setView] = useState("top");
  const [tab, setTab] = useState("Overview");
  const [expert, setExpert] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("device");
    if (slug) {
      setSelected(slug);
      setActiveCategory("Mainboard");
      setWorkspaceMode("explorer");
    }
  }, []);
  const [filters, setFilters] = useState<Record<string, string>>({});
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

    async function connectRemoteCatalog() {
      try {
        const { subscribeToPublishedComponents, subscribeToPublishedProducts } =
          await import("@/lib/firestore");
        if (cancelled) return;

        unsubscribeProducts = subscribeToPublishedProducts(
          (remoteProducts) => {
            if (cancelled) return;
            setCatalog(remoteProducts);
            setSelected((current) => {
              if (
                !current ||
                remoteProducts.some((item) => item.slug === current)
              ) {
                return current;
              }
              return initialSlug ? remoteProducts[0]?.slug : undefined;
            });
          },
          () =>
            setNotice(
              "Không thể đồng bộ danh sách mainboard. Vui lòng kiểm tra kết nối và tải lại trang.",
            ),
        );
        unsubscribeComponents = subscribeToPublishedComponents(
          (remoteComponents) => {
            if (cancelled) return;
            setCatalogComponents(remoteComponents);
          },
          () =>
            setNotice(
              "Không thể đồng bộ danh sách linh kiện. Vui lòng kiểm tra kết nối và tải lại trang.",
            ),
        );
      } catch {
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
  const product = selected
    ? catalog.find((p) => p.slug === selected)
    : undefined;
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
  function browseCategory(name: string) {
    if (name !== activeCategory) setFilters({});
    setActiveCategory(name);
    setWorkspaceMode("components");
    setActive(null);
    setSelectedComponentId(null);
    setTab("Overview");
    setMobileMenu(false);
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
    const categorySlug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const bundled = products.some((item) => item.slug === p.slug);
    history.replaceState(
      null,
      "",
      bundled
        ? `${basePath}/explore/${categorySlug}/${p.slug}/`
        : `${basePath}/?device=${encodeURIComponent(p.slug)}`,
    );
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
    history.replaceState(null, "", `${basePath}/`);
  }
  return (
    <div className="app-shell">
      <dialog ref={technologyDialog} className="info-dialog">
        <div className="section-heading">
          <h2>Kết nối công nghệ</h2>
          <button onClick={() => technologyDialog.current?.close()}>
            Đóng
          </button>
        </div>
        {product?.hotspots.map((h) => (
          <section key={h.id}>
            <h3>{h.title}</h3>
            <p>{h.description}</p>
          </section>
        ))}
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
            onClick={() => browseCategory("Mainboard")}
          >
            Linh kiện
          </button>
          <button
            onClick={() => {
              setWorkspaceMode("explorer");
              setTab("Compatibility");
            }}
          >
            Xây dựng cấu hình
          </button>
          <button
            onClick={() => {
              const dialog = document.querySelector(
                ".comparison-dialog",
              ) as HTMLDialogElement | null;
              if (dialog && comparison.length >= 2) dialog.showModal();
              else
                setNotice(
                  "Chọn ít nhất 2 thiết bị cùng loại bằng nút Thêm vào so sánh.",
                );
            }}
          >
            So sánh
          </button>
          <button
            onClick={() => {
              setExpert(false);
              setNotice(
                "Chế độ cơ bản: chọn linh kiện để tìm hiểu cách hoạt động.",
              );
            }}
          >
            Tìm hiểu
          </button>
          <button onClick={() => technologyDialog.current?.showModal()}>
            Công nghệ
          </button>
        </nav>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search products"
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
          aria-label="Toggle component menu"
          onClick={() => setMobileMenu((v) => !v)}
        >
          <Menu size={20} />
        </button>
      </header>
      <div className="workspace">
        <aside
          className={
            "sidebar " +
            (mobileMenu ? "visible " : "") +
            (workspaceMode === "home" ? "home-sidebar" : "")
          }
        >
          {workspaceMode === "components" && !activeComponent && (
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
                {workspaceMode === "home" && (
                  <span className="category-count">{categoryCount(name)}</span>
                )}
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
                    <h1>Khám phá cấu tạo phần cứng</h1>
                    <p>Chọn một danh mục hoặc tìm kiếm để bắt đầu</p>
                    <button
                      className="home-cta"
                      onClick={() => browseCategory("Mainboard")}
                    >
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
                  <button onClick={() => browseCategory("Mainboard")}>
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
        ) : workspaceMode === "components" ? (
          isCatalogComponent && activeComponent ? (
            <>
              <main className="explorer-main component-review">
                <div className="review-actions">
                  <button onClick={backToLibrary}>← Quay lại danh sách</button>
                  <button onClick={() => toggleComparison(activeComponent)}>
                    {comparison.some((i) => i.id === activeComponent.id)
                      ? "Bỏ khỏi so sánh"
                      : "＋ Thêm vào so sánh"}
                  </button>
                </div>
                <div className="breadcrumb">
                  Linh kiện <ChevronRight size={11} /> {activeCategory}{" "}
                  <ChevronRight size={11} />{" "}
                  <span>{activeComponent.brand}</span>
                </div>
                <div className="title-row">
                  <div>
                    <span className="eyebrow">{activeCategory} EXPLORER</span>
                    <h1>{activeComponent.name}</h1>
                    <p>
                      {activeComponent.brand || activeCategory} ·{" "}
                      {activeComponent.model}
                    </p>
                  </div>
                </div>
                <ComponentCanvas
                  key={activeComponent.id}
                  component={activeComponent}
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
              <div className="review-actions">
                <button onClick={backToLibrary}>← Quay lại danh sách</button>
                <button onClick={() => toggleComparison(product)}>
                  {comparison.some((i) => i.id === product.id)
                    ? "Bỏ khỏi so sánh"
                    : "＋ Thêm vào so sánh"}
                </button>
              </div>
              <div className="breadcrumb">
                Components <ChevronRight size={11} /> Mainboard{" "}
                <ChevronRight size={11} /> <span>{product.brand}</span>
              </div>
              <div className="title-row">
                <div>
                  <span className="eyebrow">KHÁM PHÁ MAINBOARD</span>
                  <h1>{product.name}</h1>
                  <p>
                    {["Chipset", "Socket", "Memory type", "PCIe", "WiFi"]
                      .map((k) => product.spec[k])
                      .filter(Boolean)
                      .join("  /  ")}
                  </p>
                </div>
                <button
                  className="expert-toggle"
                  onClick={() => setExpert((v) => !v)}
                  aria-pressed={expert}
                >
                  <span>Cơ bản</span>
                  <span className={"toggle " + (expert ? "on" : "")} />
                  <span>Nâng cao</span>
                </button>
              </div>
              <DeviceCanvas
                key={product.id + view}
                product={product}
                active={active}
                view={view}
                expert={expert}
                onSelect={(h) => {
                  setActive(h.id);
                  setTab("Overview");
                }}
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
              active={product.hotspots.find((h) => h.id === active)}
              tab={tab}
              setTab={setTab}
              onClose={() => setActive(null)}
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
