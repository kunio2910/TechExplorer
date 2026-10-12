"use client";
import { useRef } from "react";
import { deviceType, specLabel, type Device } from "@/lib/catalog-tools";
import { assetUrl } from "@/lib/runtime";
export default function DeviceComparison({
  items,
  onRemove,
}: {
  items: Device[];
  onRemove: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (!items.length) return null;
  const keys = [...new Set(items.flatMap((item) => Object.keys(item.spec)))];
  return (
    <>
      <div className="comparison-tray">
        <strong>
          {items.length} thiết bị đã chọn · {deviceType(items[0])}
        </strong>
        <div>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onRemove(item.id)}
              aria-label={`Bỏ ${item.name} khỏi so sánh`}
            >
              {item.name} ×
            </button>
          ))}
        </div>
        <button
          className="primary"
          disabled={items.length < 2}
          onClick={() => dialog.current?.showModal()}
        >
          So sánh →
        </button>
      </div>
      <dialog ref={dialog} className="info-dialog comparison-dialog">
        <div className="section-heading">
          <h2>So sánh {deviceType(items[0])}</h2>
          <button onClick={() => dialog.current?.close()}>Đóng</button>
        </div>
        <div className="compare-scroll">
          <table>
            <thead>
              <tr>
                <th>Thông số</th>
                {items.map((item) => (
                  <th key={item.id}>
                    <img
                      src={assetUrl(
                        "media" in item ? item.media.top : item.imageUrl,
                      )}
                      alt=""
                    />
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key}
                  className={
                    new Set(items.map((i) => i.spec[key] ?? "—")).size > 1
                      ? "different"
                      : ""
                  }
                >
                  <th>{specLabel(key)}</th>
                  {items.map((item) => (
                    <td key={item.id}>{item.spec[key] || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">Các hàng nổi bật có thông số khác nhau.</p>
      </dialog>
    </>
  );
}
