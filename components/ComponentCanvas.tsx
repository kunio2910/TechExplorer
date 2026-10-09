"use client";

import { assetUrl } from "@/lib/runtime";
import type { CatalogComponent } from "@/lib/types";
import { Maximize, Minus, Move, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useState } from "react";

export default function ComponentCanvas({
  component,
}: {
  component: CatalogComponent;
}) {
  const [ratio, setRatio] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [failed, setFailed] = useState(false);
  const source = component.imageUrl?.trim();

  return (
    <div className="canvas component-canvas">
      <div className="canvas-meta">
        <span>
          <i className="live-dot" /> COMPONENT PREVIEW
        </span>
        <span>{component.type} · NO HOTSPOTS</span>
      </div>
      <div
        className="image-stage component-image-stage"
        style={{
          transform: `rotate(${rotation}deg) scale(${zoom})`,
          aspectRatio: ratio,
        }}
      >
        {source && !failed ? (
          <img
            className="component-image"
            src={assetUrl(source)}
            alt={`${component.name} ${component.model}`}
            width={720}
            height={720}
            onLoad={(event) => {
              const image = event.currentTarget;
              setRatio(image.naturalWidth / image.naturalHeight || 1);
            }}
            onError={() => setFailed(true)}
            draggable={false}
          />
        ) : (
          <div className="image-placeholder">
            Chưa có ảnh linh kiện
          </div>
        )}
      </div>
      <div className="canvas-floor" />
      <div className="canvas-caption">
        <Move size={13} /> Hình ảnh linh kiện, không có hotspot.
      </div>
      <div className="zoom-bar">
        <button
          aria-label="Thu nhỏ"
          onClick={() => setZoom((value) => Math.max(0.8, value - 0.1))}
        >
          <Minus size={16} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Phóng to"
          onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))}
        >
          <Plus size={16} />
        </button>
        <span className="divider" />
        <button aria-label="Đặt lại thu phóng" onClick={() => setZoom(1)}>
          <RotateCcw size={15} />
        </button>
        <button
          aria-label="Xoay ảnh linh kiện"
          onClick={() => setRotation((angle) => (angle + 90) % 360)}
        >
          <RotateCw size={15} />
        </button>
        <button
          aria-label="Phóng to toàn màn hình"
          onClick={(event) =>
            event.currentTarget.closest(".canvas")?.requestFullscreen?.()
          }
        >
          <Maximize size={15} />
        </button>
      </div>
    </div>
  );
}
