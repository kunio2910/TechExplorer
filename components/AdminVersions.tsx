"use client";
import { useState } from "react";
import { loadDeviceVersions, type DeviceVersion } from "@/lib/firestore";
import { deviceType, type Device } from "@/lib/catalog-tools";
export default function AdminVersions({
  item,
  onRestore,
}: {
  item: Device;
  onRestore: (item: Device) => void;
}) {
  const [versions, setVersions] = useState<DeviceVersion[]>([]),
    [preview, setPreview] = useState<DeviceVersion | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="feature-card admin-versions">
      <h2>Phiên bản dữ liệu</h2>
      <p>
        Lưu bản chụp lên Firestore. Phục hồi tạo bản nháp để kiểm tra trước khi
        lưu lại.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await loadDeviceVersions(
              deviceType(item) === "Mainboard" ? "products" : "components",
              item.id,
            );
            setVersions(result);
            setMessage(
              result.length
                ? ""
                : "Chưa có phiên bản. Lần lưu tiếp theo sẽ tạo bản chụp dữ liệu.",
            );
          } catch {
            setMessage(
              "Không thể tải phiên bản. Hãy kiểm tra kết nối và Rules Firestore.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang tải…" : "Xem phiên bản đã lưu"}
      </button>
      {message && <p role="status">{message}</p>}
      {versions.map((version) => (
        <button
          className="version-row"
          key={version.id}
          onClick={() => setPreview(version)}
        >
          {new Date(version.savedAt).toLocaleString("vi-VN")} · {version.by}
          <small>
            {version.snapshot.name} ·{" "}
            {version.snapshot.status === "published"
              ? "Đã xuất bản"
              : "Bản nháp"}
          </small>
        </button>
      ))}
      {preview && (
        <div className="version-preview">
          <h3>{preview.snapshot.name}</h3>
          <p>{preview.snapshot.description}</p>
          <strong>Các mục khác với bản đang sửa:</strong>
          <ul>
            {[
              ...new Set([
                ...Object.keys(item),
                ...Object.keys(preview.snapshot),
              ]),
            ]
              .filter(
                (key) =>
                  !["history", "updatedAt", "updatedBy"].includes(key) &&
                  JSON.stringify(
                    (item as unknown as Record<string, unknown>)[key],
                  ) !==
                    JSON.stringify(
                      (preview.snapshot as unknown as Record<string, unknown>)[
                        key
                      ],
                    ),
              )
              .map((key) => (
                <li key={key}>
                  {{
                    name: "Tên",
                    description: "Mô tả",
                    spec: "Thông số kỹ thuật",
                    media: "Ảnh",
                    gallery: "Bộ ảnh",
                    hotspots: "Hotspot",
                    components: "Linh kiện đi kèm",
                    status: "Trạng thái",
                    slug: "Đường dẫn",
                    imageUrl: "Ảnh đại diện",
                  }[key] ?? key}
                </li>
              ))}
          </ul>
          <button
            onClick={() => {
              if (
                confirm(
                  "Phục hồi phiên bản này thành bản nháp? Bấm Lưu lên Firestore sau khi kiểm tra.",
                )
              ) {
                onRestore({
                  ...preview.snapshot,
                  status: "draft",
                  deletedAt: undefined,
                  updatedAt: item.updatedAt,
                  updatedBy: item.updatedBy,
                  history: item.history,
                });
                setPreview(null);
              }
            }}
          >
            Phục hồi phiên bản thành bản nháp
          </button>
          <button onClick={() => setPreview(null)}>Đóng xem trước</button>
        </div>
      )}
    </section>
  );
}
