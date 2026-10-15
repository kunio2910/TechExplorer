"use client";
import { useEffect, useRef, useState } from "react";
import {
  parseProductFile,
  type ImportPreview as Preview,
} from "@/lib/product-import";
import { specLabel, type Device } from "@/lib/catalog-tools";
import { normalizeSpecs } from "@/lib/spec-units";
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
          Chọn file JSON hoặc CSV chứa một sản phẩm. Dữ liệu được áp dụng vào
          bản nháp để bạn kiểm tra trước khi lưu lên Firestore.
        </p>
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
          {busy && <p role="status">Đang đọc file…</p>}
        </div>
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
