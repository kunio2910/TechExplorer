"use client";
import { useEffect, useRef, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/lib/firebase-client";
import { specLabel, type Device } from "@/lib/catalog-tools";
import { normalizeSpecs } from "@/lib/spec-units";
type Preview = {
  sourceUrl: string;
  fetchedAt: string;
  fields: { key: string; value: string }[];
  images: string[];
  missing: string[];
  warnings: string[];
};
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
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
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
  async function load() {
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      const call = httpsCallable<{ url: string; type: string }, Preview>(
        getFunctions(firebaseApp, "asia-southeast1"),
        "importProduct",
        { timeout: 60000 },
      );
      const result = (await call({ url: url.trim(), type })).data;
      setPreview(result);
      setSelected(result.fields.map((f) => f.key));
      setImages(result.images);
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        [
          "functions/not-found",
          "functions/internal",
          "functions/unavailable",
        ].includes(code ?? "")
          ? "Chưa kết nối được dịch vụ nhập dữ liệu. Kiểm tra Cloud Function importProduct đã triển khai và project đã bật Blaze."
          : e instanceof Error
            ? e.message
            : "Không thể lấy thông tin.",
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
    if (images.length) {
      if ("media" in next) {
        if (!onlyEmpty || !next.media.top) {
          next.media.top = images[0];
          next.media.main = images[0];
        }
      } else if (!onlyEmpty || !next.imageUrl) next.imageUrl = images[0];
      next.gallery = [...new Set([...(next.gallery ?? []), ...images])];
    }
    if ("media" in next && (!onlyEmpty || !next.sourceUrl))
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
          <h2 id="import-title">Tự động điền {type}</h2>
          <button
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng nhập dữ liệu"
          >
            ×
          </button>
        </div>
        <p>
          Dán link sản phẩm hoặc trang thông số chính hãng. Dữ liệu được áp dụng
          vào bản nháp để bạn kiểm tra trước khi lưu lên Firestore.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label>
            Link sản phẩm chính hãng
            <input
              autoFocus
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              placeholder="https://www.asus.com/.../techspec/"
            />
          </label>
          <small>
            ASUS, MSI, GIGABYTE, ASRock, Intel, AMD, Corsair, Kingston, Crucial,
            Samsung, Seasonic, Cooler Master. Trang tải thông số bằng JavaScript
            có thể chỉ đọc được thông tin cơ bản.
          </small>
          <button className="primary" disabled={busy}>
            {busy ? "Đang lấy thông tin…" : "Lấy thông tin"}
          </button>
        </form>
        {error && (
          <p role="alert" className="admin-message">
            {error}
          </p>
        )}
        {preview && (
          <>
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
            <p>
              Nguồn:{" "}
              <a href={preview.sourceUrl} target="_blank" rel="noreferrer">
                {preview.sourceUrl}
              </a>
            </p>
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
