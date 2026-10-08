"use client";
import { assetUrl, basePath } from "@/lib/runtime";
import { useState } from "react";
import { Plus, Minus, RotateCcw, RotateCw, Maximize, Move } from "lucide-react";
import { Product, Hotspot } from "@/lib/types";
export default function DeviceCanvas({
  product,
  active,
  onSelect,
  view,
  expert,
}: {
  product: Product;
  active: string | null;
  onSelect: (h: Hotspot) => void;
  view: string;
  expert: boolean;
}) {
  const [ratio, setRatio] = useState(720 / 950);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [failed, setFailed] = useState(false);
  const hotspots = product.hotspots.filter(
    (h) => h.view === (view === "rear_io" ? "rear_io" : "top"),
  );
  const source =
    view === "rear_io"
      ? product.media.rear_io
      : view === "xray"
        ? product.media.xray
        : view === "exploded"
          ? product.media.exploded
          : product.media.top;
  return (
    <div className={"canvas " + (view === "signal" ? "signal" : "")}>
      <div className="canvas-meta">
        <span>
          <i className="live-dot" /> INTERACTIVE EXPLORER
        </span>
        <span>01 / {String(hotspots.length).padStart(2, "0")} NODES</span>
      </div>
      <div className="orbital orbital-one" />
      <div className="orbital orbital-two" />
      <div
        className="image-stage"
        style={{
          transform: `rotate(${rotation}deg) scale(${zoom})`,
          aspectRatio: ratio,
        }}
      >
        {source && !failed ? (
          <img
            className="board-image"
            src={assetUrl(source)}
            alt={`${product.name} ${view} view`}
            width={720}
            height={950}
            onLoad={(e) =>
              setRatio(
                e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
              )
            }
            onError={() => setFailed(true)}
            draggable={false}
          />
        ) : (
          <div className="image-placeholder">Product image unavailable</div>
        )}
        {view === "signal" && (
          <svg
            className="signal-paths"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={hotspots
                .map((h) => {
                  const cpu =
                    hotspots.find((node) => node.type === "cpu_socket") ??
                    hotspots[0];
                  return cpu ? `M${cpu.x} ${cpu.y} V${h.y} H${h.x}` : "";
                })
                .join(" ")}
            />
          </svg>
        )}
        {!failed &&
          hotspots.map((h, index) => (
            <button
              key={h.id}
              className={"hotspot " + (active === h.id ? "selected" : "")}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              onClick={() => onSelect(h)}
              aria-pressed={active === h.id}
              aria-label={`Explore ${h.title}`}
            >
              <span className="marker">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={"callout " + (h.x > 65 ? "right" : "")}
                onClick={() => onSelect(h)}
              >
                <b>{h.title}</b>
                <small>
                  {expert ? h.subtitle : "Click to explore"} <span>↗</span>
                </small>
              </span>
            </button>
          ))}
      </div>
      <div className="canvas-floor" />
      <div className="canvas-caption">
        <Move size={13} /> Select a component to discover what connects it all.
      </div>
      <div className="zoom-bar">
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
        >
          <Minus size={16} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
        >
          <Plus size={16} />
        </button>
        <span className="divider" />
        <button aria-label="Reset zoom" onClick={() => setZoom(1)}>
          <RotateCcw size={15} />
        </button>
        <button
          aria-label="Rotate view"
          onClick={() => setRotation((angle) => (angle + 90) % 360)}
        >
          <RotateCw size={15} />
        </button>
        <button
          aria-label="Focus canvas"
          onClick={(e) =>
            e.currentTarget.closest(".canvas")?.requestFullscreen?.()
          }
        >
          <Maximize size={15} />
        </button>
      </div>
    </div>
  );
}
