"use client";
import { useEffect, useRef, useState } from "react";
import {
  parseProductFile,
  parsePastedSpecs,
  type ImportPreview as Preview,
} from "@/lib/product-import";
import { specLabel, type Device } from "@/lib/catalog-tools";
import { normalizeSpecs } from "@/lib/spec-units";

const LOCAL_IMPORT_URL = "http://127.0.0.1:8787";

function importSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export default function ProductImport({
  device,
  type,
  onApply,
  onClose,
}: {
  device: Device;
  type: string;
  onApply: (value: Device) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [mode, setMode] = useState<"local" | "file" | "paste">("local");
  const [pasted, setPasted] = useState("");
  const [url, setUrl] = useState("");
  const [localStatus, setLocalStatus] = useState<
    "checking" | "connected" | "offline"
  >("checking");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  async function checkLocalService() {
    setLocalStatus("checking");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(`${LOCAL_IMPORT_URL}/health`, {
        signal: controller.signal,
      });
      setLocalStatus(response.ok ? "connected" : "offline");
    } catch {
      setLocalStatus("offline");
    } finally {
      window.clearTimeout(timer);
    }
  }
  useEffect(() => {
    void checkLocalService();
  }, []);
  const current = (key: string): string =>
    key.startsWith("spec.")
      ? (device.spec[key.slice(5)] ?? "")
      : String((device as unknown as Record<string, unknown>)[key] ?? "");
  const label = (key: string) =>
    key.startsWith("spec.")
      ? specLabel(key.slice(5))
      : ({
          name: "Tên sản phẩm",
          brand: "Thương hiệu",
          model: "Model",
          description: "Mô tả",
        }[key] ?? key);
  async function load(file: File) {
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      if (file.size > 2_000_000) throw new Error("File tối đa 2 MB.");
      const result = parseProductFile(await file.text(), file.name, type);
      setPreview(result);
      setSelected(result.fields.map((f) => f.key));
      setImages(result.images);
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "File JSON không đúng cú pháp."
          : e instanceof Error
            ? e.message
            : "Không thể đọc file.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadFromUrl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) {
      setError("Hãy nhập URL trang sản phẩm.");
      return;
    }
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      const response = await fetch(`${LOCAL_IMPORT_URL}/extract`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), type }),
      });
      const result = (await response.json()) as Preview & { error?: string };
      if (!response.ok || result.error)
        throw new Error(result.error || "Dịch vụ cục bộ không đọc được nguồn.");
      if (!Array.isArray(result.fields) || !Array.isArray(result.images))
        throw new Error("Dữ liệu trả về từ dịch vụ không hợp lệ.");
      setPreview(result);
      setSelected(result.fields.map((f) => f.key));
      setImages(result.images);
      setLocalStatus("connected");
    } catch (e) {
      setLocalStatus("offline");
      setError(
        e instanceof Error && e.name === "TypeError"
          ? "Không kết nối được dịch vụ trên máy. Hãy chạy npm run import-server trong thư mục TechExplorer rồi thử lại."
          : e instanceof Error
            ? e.message
            : "Không thể đọc URL sản phẩm.",
      );
    } finally {
      setBusy(false);
    }
  }
  function apply() {
    if (!preview) return;
    const next = structuredClone(device);
    const applied: string[] = [];
    for (const f of preview.fields) {
      if (!selected.includes(f.key) || (onlyEmpty && current(f.key).trim()))
        continue;
      if (f.key.startsWith("spec.")) next.spec[f.key.slice(5)] = f.value;
      else if (["name", "brand", "description", "model"].includes(f.key)) {
        if (f.key === "model" && "media" in next) continue;
        Object.assign(next, { [f.key]: f.value });
      }
      applied.push(f.key);
    }
    next.spec = normalizeSpecs(next.spec);
    if (
      "media" in next &&
      (!next.slug.trim() || next.slug === "mainboard-moi")
    ) {
      const importedName =
        preview.fields.find((field) => field.key === "name")?.value ||
        next.name;
      const generatedSlug = importSlug(importedName);
      if (generatedSlug) next.slug = generatedSlug;
    }
    if (images.length) {
      if ("media" in next) {
        if (!onlyEmpty || !next.media.top) {
          next.media.top = images[0];
          next.media.main = images[0];
        }
      } else if (!onlyEmpty || !next.imageUrl) next.imageUrl = images[0];
      next.gallery = [...new Set([...(next.gallery ?? []), ...images])];
    }
    if (preview.sourceUrl && "media" in next && (!onlyEmpty || !next.sourceUrl))
      next.sourceUrl = preview.sourceUrl;
    next.importSource = {
      url: preview.sourceUrl,
      fetchedAt: preview.fetchedAt,
      fields: applied,
    };
    onApply(next);
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="import-overlay"
      aria-labelledby="import-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <section className="import-dialog">
        <div className="section-heading">
          <h2 id="import-title">Nhập dữ liệu {type}</h2>
          <button
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng nhập dữ liệu"
          >
            ×
          </button>
        </div>
        <p>
          Nhận diện hãng và dòng sản phẩm từ URL chính hãng, hoặc nhập file
          JSON/CSV. Dữ liệu chỉ được áp dụng vào bản nháp để bạn kiểm tra trước
          khi lưu lên Firestore.
        </p>
        <div
          className="import-mode-switch"
          role="tablist"
          aria-label="Cách nhập dữ liệu"
        >
          <button
            type="button"
            className={mode === "local" ? "primary" : ""}
            onClick={() => {
              setMode("local");
              setError("");
            }}
            role="tab"
            aria-selected={mode === "local"}
          >
            Nhận diện từ URL
          </button>
          <button
            type="button"
            className={mode === "file" ? "primary" : ""}
            onClick={() => {
              setMode("file");
              setError("");
            }}
            role="tab"
            aria-selected={mode === "file"}
          >
            Nhập file JSON/CSV
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "paste"}
            onClick={() => {
              setMode("paste");
              setError("");
            }}
          >
            Dán thông số
          </button>
        </div>
        {mode === "local" ? (
          <form onSubmit={loadFromUrl}>
            <label>
              URL trang sản phẩm chính hãng
              <input
                autoFocus
                type="url"
                value={url}
                placeholder="https://www.asus.com/.../spec/"
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy}
                required
              />
            </label>
            <div className="import-service-status" role="status">
              <span>
                {localStatus === "connected"
                  ? "● Dịch vụ trên máy đã kết nối"
                  : localStatus === "checking"
                    ? "○ Đang kiểm tra dịch vụ trên máy…"
                    : "○ Dịch vụ trên máy chưa chạy"}
              </span>
              <button
                type="button"
                onClick={() => void checkLocalService()}
                disabled={busy}
              >
                Kiểm tra lại
              </button>
            </div>
            <small>
              Cài một lần bằng <code>npm ci</code>, <code>npm ci --prefix functions</code> và <code>npx playwright install chromium</code>, sau đó
              chạy <code>npm run import-server</code> tại thư mục dự án. Dịch vụ
              chỉ nghe trên máy này, không cần Firebase hoặc Blaze.
            </small>
            <button
              className="primary"
              type="submit"
              disabled={busy || localStatus !== "connected"}
            >
              {busy ? "Đang lấy dữ liệu…" : "Nhận diện và xem trước"}
            </button>
          </form>
        ) : mode === "paste" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const result = parsePastedSpecs(pasted, type);
                setPreview(result);
                setSelected(result.fields.map((f) => f.key));
                setImages([]);
                setError("");
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Không đọc được thông số.",
                );
              }
            }}
          >
            <label>
              Nội dung thông số từ nhà sản xuất
              <textarea
                rows={9}
                value={pasted}
                maxLength={100000}
                onChange={(event) => setPasted(event.target.value)}
                placeholder={"Socket: AM5\nChipset: AMD B650\nLoại RAM: DDR5"}
                required
              />
            </label>
            <small>
              Dán bảng đã copy, hoặc mỗi dòng theo dạng Tên trường: Giá trị. Có
              thể dùng dấu tab, dấu | hoặc tên trường và giá trị ở hai dòng liên
              tiếp. Không cần chạy dịch vụ local.
            </small>
            <button type="submit">Phân tích và xem trước</button>
          </form>
        ) : (
          <div>
            <label>
              File dữ liệu sản phẩm
              <input
                autoFocus
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void load(file);
                  e.target.value = "";
                }}
                disabled={busy}
              />
            </label>
            <small>
              Tối đa 2 MB. CSV dùng cột name, brand, spec.Socket, spec.Capacity…
              Cột images chứa các URL ảnh cách nhau bằng dấu |.
            </small>
            <p>
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ type, name: `${type} mẫu`, brand: "Thương hiệu", spec: device.spec, images: [] }, null, 2))}`}
                download={`mau-${type.toLowerCase()}.json`}
              >
                Tải mẫu JSON ({type})
              </a>
            </p>
          </div>
        )}
        {mode === "file" && busy && <p role="status">Đang đọc file…</p>}
        {error && (
          <p role="alert" className="admin-message">
            {error}
          </p>
        )}
        {preview && (
          <>
            {preview.completeness && (
              <p role="status">
                <strong>
                  Đã lấy {preview.completeness.found}/
                  {preview.completeness.total} trường thông số
                </strong>{" "}
                · {preview.images.length} ảnh sản phẩm
              </p>
            )}
            {!!preview.attempts?.length && (
              <details>
                <summary>Các nguồn đã thử ({preview.attempts.length})</summary>
                <ul>
                  {preview.attempts.map((item, index) => (
                    <li key={index}>
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.url}
                      </a>{" "}
                      · {item.method === "browser" ? "Trình duyệt" : "HTML"} ·{" "}
                      {item.status === "ok" ? "Đã đọc" : "Không đọc được"}
                      {item.message && <small> — {item.message}</small>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {(preview.detectedBrand ||
              preview.detectedLine ||
              preview.parser) && (
              <p className="import-detection" role="status">
                Nhận diện: <strong>{preview.detectedBrand || "—"}</strong>
                {preview.detectedLine && ` · Dòng ${preview.detectedLine}`}
                {preview.parser && ` · Bộ đọc ${preview.parser}`}
              </p>
            )}
            <label className="import-choice">
              <input
                type="checkbox"
                checked={onlyEmpty}
                onChange={(e) => setOnlyEmpty(e.target.checked)}
              />
              Chỉ điền ô trống (bỏ chọn để cập nhật ô đã có)
            </label>
            {preview.warnings.map((text) => (
              <p key={text} role="status">
                {text}
              </p>
            ))}
            <div className="import-table">
              <table>
                <thead>
                  <tr>
                    <th>Chọn</th>
                    <th>Trường</th>
                    <th>Hiện tại</th>
                    <th>Tìm được</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.fields
                    .filter((f) => f.key !== "model" || !("media" in device))
                    .map((f) => (
                      <tr key={f.key}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Áp dụng ${label(f.key)}`}
                            checked={selected.includes(f.key)}
                            onChange={(e) =>
                              setSelected((p) =>
                                e.target.checked
                                  ? [...p, f.key]
                                  : p.filter((k) => k !== f.key),
                              )
                            }
                          />
                        </td>
                        <th>{label(f.key)}</th>
                        <td>{current(f.key) || "—"}</td>
                        <td>{f.value}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!!preview.missing.length && (
              <p>Cần bổ sung: {preview.missing.map(specLabel).join(", ")}.</p>
            )}
            {!!preview.images.length && (
              <>
                <h3>Ảnh sản phẩm</h3>
                <p>
                  Ảnh được chọn đầu tiên làm ảnh chính; các ảnh đã chọn được
                  thêm vào gallery.
                </p>
                <div className="import-images">
                  {preview.images.map((image, index) => (
                    <label key={image}>
                      <img src={image} alt={`Ảnh nguồn ${index + 1}`} />
                      <span>
                        <input
                          type="checkbox"
                          checked={images.includes(image)}
                          onChange={(e) =>
                            setImages((p) =>
                              e.target.checked
                                ? [...p, image]
                                : p.filter((i) => i !== image),
                            )
                          }
                        />
                        {images[0] === image ? "Ảnh chính" : "Gallery"}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
            {preview.sourceUrl && (
              <p>
                Nguồn:{" "}
                <a href={preview.sourceUrl} target="_blank" rel="noreferrer">
                  {preview.sourceUrl}
                </a>
              </p>
            )}
            <button
              className="primary"
              disabled={!selected.length && !images.length}
              onClick={apply}
            >
              Áp dụng vào bản nháp
            </button>
          </>
        )}
      </section>
    </dialog>
  );
}
