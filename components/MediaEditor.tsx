"use client";
import { useRef, useState } from "react";
import { assetUrl } from "@/lib/runtime";
import { moveImage } from "@/lib/catalog-tools";

async function compress(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error("Chọn ảnh JPG, PNG hoặc WebP dưới 15 MB.");
  const image = await createImageBitmap(file);
  try {
    for (let size = 1000; size >= 300; size -= 100) {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, size / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/webp", 0.78);
      if (url.length <= 85000) return url;
    }
    throw new Error("Ảnh quá phức tạp để nén. Hãy dùng URL ảnh.");
  } finally {
    image.close();
  }
}
export default function MediaEditor({
  images,
  onChange,
  onBusy,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<number | null>(null);
  async function files(list: FileList | null) {
    if (!list) return;
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      const added = [];
      for (const file of Array.from(list)) added.push(await compress(file));
      if (images.length + added.length > 8)
        throw new Error("Tối đa 8 ảnh; có thể thay ảnh hiện có.");
      onChange([...images, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được ảnh.");
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <section className="media-editor">
      <label
        className="media-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) void files(e.dataTransfer.files);
        }}
      >
        {busy ? "Đang nén ảnh…" : "↑ Kéo thả ảnh hoặc chọn từ máy"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={(e) => {
            void files(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <p className="muted">
        Ảnh được nén trước khi lưu. Kéo thả để sắp xếp; chọn ảnh đại diện để
        hiển thị trên trang chủ.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="media-sort-list">
        {images.map((url, index) => (
          <div
            className="media-sort-card"
            key={index}
            draggable={!busy}
            onDragStart={() => {
              drag.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (drag.current !== null)
                onChange(moveImage(images, drag.current, index));
              drag.current = null;
            }}
          >
            <img src={assetUrl(url)} alt={`Ảnh ${index + 1}`} />
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onChange(moveImage(images, index, 0))}
            >
              {index === 0 ? "Ảnh đại diện" : "Đặt đại diện"}
            </button>
            <div>
              <button
                aria-label={`Đưa ảnh ${index + 1} sang trái`}
                disabled={index === 0}
                onClick={() => onChange(moveImage(images, index, index - 1))}
              >
                ←
              </button>
              <button
                aria-label={`Đưa ảnh ${index + 1} sang phải`}
                disabled={index === images.length - 1}
                onClick={() => onChange(moveImage(images, index, index + 1))}
              >
                →
              </button>
              <button
                className="danger"
                aria-label={`Xóa ảnh ${index + 1}`}
                onClick={() => onChange(images.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
