"use client";
import { assetUrl } from "@/lib/runtime";
import { specLabel, deviceType, type Device } from "@/lib/catalog-tools";
export default function CatalogCard({
  item,
  onOpen,
  onCompare,
  selected = false,
}: {
  item: Device;
  onOpen: () => void;
  onCompare?: () => void;
  selected?: boolean;
}) {
  const image = "media" in item ? item.media.top : item.imageUrl;
  return (
    <article className="device-card-shell">
      <button
        className="device-card"
        aria-label={`Open ${item.name}`}
        onClick={onOpen}
      >
        <div className="device-card-media">
          {image ? (
            <img src={assetUrl(image)} alt="" loading="lazy" />
          ) : (
            <span className="device-card-placeholder">{deviceType(item)}</span>
          )}
        </div>
        <div className="device-card-body">
          <div className="device-card-meta">
            <span>{item.brand}</span>
            <span>ĐÃ XUẤT BẢN</span>
          </div>
          <h2>{item.name}</h2>
          {Object.entries(item.spec)
            .filter(([, value]) => value)
            .slice(0, 3)
            .map(([key, value]) => (
              <small className="device-key-spec" key={key}>
                {specLabel(key)}: {value}
              </small>
            ))}
          <span className="device-card-cta">Xem chi tiết →</span>
        </div>
      </button>
      {onCompare && (
        <button
          className="compare-card-action"
          aria-pressed={selected}
          onClick={onCompare}
        >
          {selected ? "✓ Đã chọn so sánh" : "＋ Thêm vào so sánh"}
        </button>
      )}
    </article>
  );
}
