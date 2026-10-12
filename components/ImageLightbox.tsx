"use client";
import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/runtime";
export default function ImageLightbox({
  images,
  initial,
  open,
  onClose,
}: {
  images: string[];
  initial: string;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (open) {
      setIndex(Math.max(0, images.indexOf(initial)));
      if (!ref.current?.open) ref.current?.showModal();
    } else ref.current?.close();
  }, [open, initial]);
  const safe = Math.min(index, Math.max(0, images.length - 1));
  const move = (step: number) =>
    setIndex((safe + step + images.length) % images.length);
  return (
    <dialog
      ref={ref}
      className="image-lightbox"
      onClose={onClose}
      aria-label="Xem ảnh lớn"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
      }}
    >
      <button
        className="lightbox-close"
        onClick={() => ref.current?.close()}
        aria-label="Đóng ảnh lớn"
      >
        ×
      </button>
      <img src={assetUrl(images[safe])} alt={`Ảnh sản phẩm ${safe + 1}`} />
      {images.length > 1 && (
        <div>
          <button onClick={() => move(-1)} aria-label="Ảnh trước">
            ←
          </button>
          <span>
            {safe + 1} / {images.length}
          </span>
          <button onClick={() => move(1)} aria-label="Ảnh tiếp theo">
            →
          </button>
        </div>
      )}
      <p>← → chuyển ảnh · Esc đóng</p>
    </dialog>
  );
}
