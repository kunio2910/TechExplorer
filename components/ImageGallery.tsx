"use client";

import { assetUrl } from "@/lib/runtime";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function ImageGallery({
  images,
  alt,
  className = "",
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(images.length - 1, 0)));
  }, [images.length]);

  if (!images.length) {
    return (
      <div className={"image-gallery image-gallery-empty " + className}>
        <span>Chưa có ảnh để xem trước.</span>
      </div>
    );
  }

  return (
    <div className={"image-gallery " + className}>
      <div className="gallery-main">
        <img
          key={images[safeIndex]}
          src={assetUrl(images[safeIndex])}
          alt={alt}
          className="gallery-main-image"
        />
        {images.length > 1 && (
          <>
            <button
              className="gallery-nav gallery-nav-prev"
              aria-label="Ảnh trước"
              onClick={() =>
                setActiveIndex(
                  (safeIndex - 1 + images.length) % images.length,
                )
              }
            >
              <ChevronLeft size={19} />
            </button>
            <button
              className="gallery-nav gallery-nav-next"
              aria-label="Ảnh tiếp theo"
              onClick={() => setActiveIndex((safeIndex + 1) % images.length)}
            >
              <ChevronRight size={19} />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbnails" aria-label="Ảnh thu nhỏ">
          {images.map((image, index) => (
            <button
              key={image + "-" + index}
              className={"gallery-thumbnail " + (index === safeIndex ? "active" : "")}
              aria-label={"Chọn ảnh " + (index + 1)}
              aria-pressed={index === safeIndex}
              onClick={() => setActiveIndex(index)}
            >
              <img src={assetUrl(image)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
