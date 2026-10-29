"use client";
import { useEffect, useState } from "react";
import {
  buildSlots,
  newBuild,
  validateBuild,
  checkBuild,
  selectedParts,
  candidateCompatibility,
  type PcBuild,
  type BuildSlot,
} from "@/lib/pc-build";
import { deviceType, specLabel, type Device } from "@/lib/catalog-tools";
import { categoryLabel } from "@/lib/labels";
import { assetUrl, basePath } from "@/lib/runtime";
export default function PcBuilder({
  devices,
  onOpen,
  onNotice,
  initialItem,
  onInitialItemConsumed,
}: {
  devices: Device[];
  onOpen: (item: Device) => void;
  onNotice: (message: string) => void;
  initialItem?: Device | null;
  onInitialItemConsumed?: () => void;
}) {
  const [build, setBuild] = useState<PcBuild | null>(null),
    [saved, setSaved] = useState<PcBuild[]>([]),
    [slot, setSlot] = useState<BuildSlot | null>(null),
    [search, setSearch] = useState("");
  const [ready, setReady] = useState(false),
    [link, setLink] = useState("");
  const [compatibleOnly, setCompatibleOnly] = useState(true);
  useEffect(() => {
    let next = newBuild();
    try {
      const list = JSON.parse(
        localStorage.getItem("tech-explorer-builds-v1") ?? "[]",
      );
      if (Array.isArray(list))
        setSaved(
          list.flatMap((x) => {
            try {
              return [validateBuild(x)];
            } catch {
              return [];
            }
          }),
        );
    } catch {
      onNotice("Không thể đọc cấu hình đã lưu.");
    }
    try {
      const raw = new URLSearchParams(location.search).get("build");
      if (raw) {
        if (raw.length > 6000) throw Error("Link cấu hình quá dài.");
        next = validateBuild(JSON.parse(raw));
        next.id = crypto.randomUUID();
      } else {
        const rawDraft = localStorage.getItem("tech-explorer-build-draft-v1");
        if (rawDraft) next = validateBuild(JSON.parse(rawDraft));
      }
    } catch {
      onNotice(
        "Không thể khôi phục cấu hình từ link hoặc bản nháp. Đã mở cấu hình mới.",
      );
    }
    setBuild(next);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && build)
      try {
        localStorage.setItem(
          "tech-explorer-build-draft-v1",
          JSON.stringify(build),
        );
      } catch {
        onNotice("Không thể tự lưu cấu hình trên trình duyệt.");
      }
  }, [build, ready]);
  useEffect(() => {
    if (!ready || !build || !initialItem) return;
    const slotType = deviceType(initialItem) as BuildSlot;
    if (!buildSlots.includes(slotType)) return;
    setBuild((current) =>
      current
        ? { ...current, parts: { ...current.parts, [slotType]: initialItem.id } }
        : current,
    );
    onNotice(`Đã thêm ${initialItem.name} vào cấu hình.`);
    onInitialItemConsumed?.();
  }, [initialItem, ready]);
  function persist(list: PcBuild[]) {
    try {
      localStorage.setItem("tech-explorer-builds-v1", JSON.stringify(list));
      setSaved(list);
      return true;
    } catch {
      onNotice("Không thể lưu cấu hình trên trình duyệt.");
      return false;
    }
  }
  function repairCheck(title: string) {
    if (!build) return;
    const slot = title.includes("Socket")
      ? "CPU"
      : title.includes("bộ nhớ") || title.includes("khe RAM") || title.includes("Dung lượng RAM")
        ? "RAM"
        : title.includes("SSD")
          ? "SSD"
          : title.includes("Nguồn")
            ? "PSU"
            : undefined;
    if (slot) {
      setSlot(slot);
      setSearch("");
      setCompatibleOnly(true);
      onNotice("Chọn thiết bị thay thế. Thiết bị hiện tại được giữ đến khi bạn chọn.");
    }
  }
  if (!build)
    return <main className="feature-workspace">Đang tải cấu hình…</main>;
  const parts = selectedParts(build, devices),
    checks = checkBuild(build, devices);
  const update = (patch: Partial<PcBuild>) => {
    setLink("");
    setBuild({ ...build, ...patch });
  };
  function share() {
    if (!build) return;
    const p = new URLSearchParams({
      screen: "builder",
      build: JSON.stringify(validateBuild(build)),
    });
    const url = `${location.origin}${basePath}/?${p}`;
    setLink(url);
    navigator.clipboard
      ?.writeText(url)
      .then(() => onNotice("Đã sao chép link cấu hình."))
      .catch(() => onNotice("Hãy sao chép link trong ô bên dưới."));
  }
  return (
    <main className="feature-workspace builder-workspace">
      <span className="eyebrow">CẤU HÌNH PC CỦA BẠN</span>
      <h1>Xây dựng cấu hình PC</h1>
      <p>
        Chọn thiết bị thực tế trong thư viện. Cấu hình và bản nháp được lưu trên
        trình duyệt này.
      </p>
      <div className="feature-toolbar">
        <label>
          Tên cấu hình
          <input
            maxLength={120}
            value={build.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <button
          onClick={() => {
            const item = {
              ...build,
              name: build.name.trim() || "Cấu hình PC",
              updatedAt: new Date().toISOString(),
            };
            if (persist([...saved.filter((x) => x.id !== item.id), item])) {
              setBuild(item);
              onNotice("Đã lưu cấu hình trên trình duyệt.");
            }
          }}
        >
          Lưu cấu hình
        </button>
        <button onClick={share}>Chia sẻ cấu hình</button>
        <button
          onClick={() => {
            if (
              confirm(
                "Tạo cấu hình mới? Bản đang sửa chỉ được giữ nếu đã bấm Lưu cấu hình.",
              )
            )
              update(newBuild());
          }}
        >
          ＋ Cấu hình mới
        </button>
        <button
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(build, null, 2)], {
                type: "application/json",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "cau-hinh-pc.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Xuất JSON
        </button>
      </div>
      {link && (
        <label>
          Link cấu hình
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <div className="builder-columns">
        <section>
          <h2>Linh kiện trong cấu hình</h2>
          {buildSlots.map((type) => {
            const item = parts[type],
              image =
                item && ("media" in item ? item.media.top : item.imageUrl);
            return (
              <article className="build-slot" key={type}>
                <span className="eyebrow">{categoryLabel(type)}</span>
                <div className="build-slot-main">
                  {image && <img src={assetUrl(image)} alt="" />}
                  <div>
                    <strong>
                      {item?.name ??
                        (build.parts[type]
                          ? "Thiết bị không còn khả dụng"
                          : "Chưa chọn thiết bị")}
                    </strong>
                    {item && (
                      <small>
                        {Object.entries(item.spec)
                          .slice(0, 2)
                          .map(([k, v]) => `${specLabel(k)}: ${v}`)
                          .join(" · ")}
                      </small>
                    )}
                  </div>
                </div>
                <div className="feature-actions">
                  <button
                    onClick={() => {
                      setSlot(type);
                      setSearch("");
                    }}
                  >
                    {" "}
                    {item ? "Đổi thiết bị" : "＋ Chọn thiết bị"}
                  </button>
                  {item && (
                    <>
                      <button onClick={() => onOpen(item)}>Xem chi tiết</button>
                      <button
                        onClick={() => {
                          const next = { ...build.parts };
                          delete next[type];
                          update({ parts: next });
                        }}
                      >
                        Bỏ chọn
                      </button>
                    </>
                  )}
                  {(type === "RAM" || type === "SSD") && (
                    <label>
                      {type === "RAM" ? "Số bộ RAM" : "Số ổ"}
                      <select
                        value={type === "RAM" ? build.ramKits : build.drives}
                        onChange={(e) =>
                          update(
                            type === "RAM"
                              ? { ramKits: Number(e.target.value) }
                              : { drives: Number(e.target.value) },
                          )
                        }
                      >
                        {Array.from(
                          { length: type === "RAM" ? 8 : 16 },
                          (_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                </div>
              </article>
            );
          })}
        </section>
        <aside>
          <section className="feature-card">
            <h2>Kiểm tra cấu hình</h2>
            <p>
              {buildSlots.filter((s) => parts[s]).length}/6 nhóm linh kiện đã
              chọn
            </p>
            {checks.map((check, i) => (
              <div className={`build-check ${check.status}`} key={i}>
                <strong>
                  {check.status === "compatible"
                    ? "✓"
                    : check.status === "incompatible"
                      ? "×"
                      : "!"}{" "}
                  {check.title}
                </strong>
                <p>{check.detail}</p>
                {check.status === "incompatible" && (
                  <button className="text-button" onClick={() => repairCheck(check.title)}>
                    Gợi ý sửa lỗi →
                  </button>
                )}
              </div>
            ))}
          </section>
          <section className="feature-card">
            <h2>Cấu hình đã lưu</h2>
            {saved.length ? (
              saved.map((item) => (
                <div className="saved-build" key={item.id}>
                  <strong>{item.name}</strong>
                  <small>
                    {Object.values(item.parts).filter(Boolean).length}/6 nhóm
                    linh kiện
                  </small>
                  <div className="feature-actions">
                    <button
                      onClick={() => {
                        if (
                          confirm("Mở cấu hình này và thay bản đang chỉnh sửa?")
                        )
                          update(item);
                      }}
                    >
                      Mở
                    </button>
                    <button
                      onClick={() =>
                        update({
                          ...item,
                          id: crypto.randomUUID(),
                          name: `${item.name} (bản sao)`.slice(0, 120),
                        })
                      }
                    >
                      Nhân đôi
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xóa cấu hình “${item.name}”?`))
                          persist(saved.filter((x) => x.id !== item.id));
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>Chưa lưu cấu hình nào.</p>
            )}
          </section>
        </aside>
      </div>
      {slot && (
        <div className="feature-modal-backdrop" onClick={() => setSlot(null)}>
          <section
            className="feature-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Chọn ${slot}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSlot(null);
            }}
          >
            <div className="section-heading">
              <h2>Chọn {categoryLabel(slot)}</h2>
              <button autoFocus onClick={() => setSlot(null)}>
                Đóng
              </button>
            </div>
            <label>
              Tìm thiết bị
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="builder-filter-toggle">
              <input
                type="checkbox"
                checked={compatibleOnly}
                onChange={(event) => setCompatibleOnly(event.target.checked)}
              />
              Chỉ hiển thị thiết bị tương thích với lựa chọn hiện tại
            </label>
            <div className="build-options">
              {devices
                .filter(
                  (x) =>
                    deviceType(x) === slot &&
                    `${x.name} ${x.brand}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .filter(
                  (item) =>
                    !compatibleOnly ||
                    candidateCompatibility(slot, item, build, devices).ok,
                )
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      update({ parts: { ...build.parts, [slot]: item.id } });
                      setSlot(null);
                    }}
                  >
                    <strong>{item.name}</strong>
                    {compatibleOnly && (
                      <small className="compatibility-hint">
                        {candidateCompatibility(slot, item, build, devices).unknown
                          ? "! Chưa đủ thông tin để xác nhận"
                          : "✓ Phù hợp theo thông số đã kiểm tra"}
                      </small>
                    )}
                    <small>
                      {Object.entries(item.spec)
                        .slice(0, 3)
                        .map(([k, v]) => `${specLabel(k)}: ${v}`)
                        .join(" · ")}
                    </small>
                  </button>
                ))}
            </div>
            {!devices.some((x) => deviceType(x) === slot) && (
              <p>Chưa có thiết bị được xuất bản trong nhóm này.</p>
            )}
            {compatibleOnly &&
              devices.some((x) => deviceType(x) === slot) &&
              !devices.some(
                (x) =>
                  deviceType(x) === slot &&
                  candidateCompatibility(slot, x, build, devices).ok,
              ) && (
                <div className="empty-builder-options">
                  <p>Không có lựa chọn tương thích với cấu hình hiện tại.</p>
                  <button onClick={() => setCompatibleOnly(false)}>
                    Hiển thị tất cả thiết bị
                  </button>
                </div>
              )}
          </section>
        </div>
      )}
    </main>
  );
}
