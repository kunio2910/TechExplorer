"use client";
import { useRef } from "react";
import {
  comparableSpecValue,
  deviceType,
  orderedSpecEntries,
  specLabel,
  type Device,
} from "@/lib/catalog-tools";
import { useEffect, useState } from "react";
import { assetUrl } from "@/lib/runtime";
export default function DeviceComparison({
  items,
  onRemove,
  open,
  onOpen,
  onClose,
  onBrowse,
  devices = [],
  onReplace,
}: {
  items: Device[];
  onRemove: (id: string) => void;
  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onBrowse?: () => void;
  devices?: Device[];
  onReplace?: (id: string, item: Device) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open)
      dialog.current.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const keys = [
    ...new Set(
      (items.length ? orderedSpecEntries(items[0]) : [])
        .map(([key]) => key)
        .concat(items.slice(1).flatMap((item) => Object.keys(item.spec))),
    ),
  ];
  return (
    <>
      {items.length > 0 && (
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
            onClick={() => onOpen?.()}
          >
            So sánh →
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="info-dialog comparison-dialog"
        onClose={() => onClose?.()}
      >
        <div className="section-heading">
          <h2>
            {items.length
              ? `So sánh ${deviceType(items[0])}`
              : "So sánh thiết bị"}
          </h2>
          <button
            onClick={() => {
              dialog.current?.close();
              onClose?.();
            }}
          >
            Đóng
          </button>
        </div>
        {!items.length ? (
          <div className="comparison-empty">
            <span className="eyebrow">CHƯA CÓ LỰA CHỌN</span>
            <h3>Chọn ít nhất hai thiết bị để bắt đầu so sánh</h3>
            <p>
              Quay lại thư viện linh kiện, chọn cùng một nhóm thiết bị rồi mở
              lại màn hình này.
            </p>
            <button
              className="primary"
              onClick={() => {
                dialog.current?.close();
                onClose?.();
                onBrowse?.();
              }}
            >
              Mở thư viện linh kiện
            </button>
          </div>
        ) : (
          <>
            <label className="comparison-option">
              <input
                type="checkbox"
                checked={onlyDifferences}
                onChange={(event) => setOnlyDifferences(event.target.checked)}
              />
              Chỉ hiển thị thông số khác nhau
            </label>
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
                        <label>
                          Đổi thiết bị
                          <select
                            value={item.id}
                            onChange={(e) => {
                              const replacement = devices.find(
                                (d) =>
                                  d.id === e.target.value &&
                                  deviceType(d) === deviceType(item),
                              );
                              if (replacement)
                                onReplace?.(item.id, replacement);
                            }}
                          >
                            {devices
                              .filter(
                                (d) =>
                                  deviceType(d) === deviceType(item) &&
                                  (d.id === item.id ||
                                    !items.some((i) => i.id === d.id)),
                              )
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => {
                    const different =
                      new Set(
                        items.map((i) => comparableSpecValue(key, i.spec[key])),
                      ).size > 1;
                    if (onlyDifferences && !different) return null;
                    return (
                      <tr key={key} className={different ? "different" : ""}>
                        <th>{specLabel(key)}</th>
                        {items.map((item) => (
                          <td key={item.id}>{item.spec[key] || "—"}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted">Các hàng nổi bật có thông số khác nhau.</p>
          </>
        )}
      </dialog>
    </>
  );
}
