"use client";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase-client";
import { deviceType, specLabel, type Device } from "@/lib/catalog-tools";

export function FeedbackForm({
  item,
  onClose,
}: {
  item: Device;
  onClose: () => void;
}) {
  const [field, setField] = useState("Tên / hình ảnh"),
    [note, setNote] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div className="feature-modal-backdrop">
      <section
        className="feature-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Báo thông tin chưa đúng"
      >
        <h2>Báo thông tin chưa đúng</h2>
        <p>{item.name}</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await addDoc(collection(firestore, "dataReports"), {
                deviceId: item.id,
                deviceType: deviceType(item),
                deviceName: item.name.slice(0, 200),
                field,
                note: note.trim(),
                status: "new",
                createdAt: serverTimestamp(),
              });
              setMessage("Đã gửi phản hồi đến quản trị viên.");
              setNote("");
            } catch {
              setMessage(
                "Chưa gửi được phản hồi. Vui lòng thử lại; nội dung vẫn được giữ.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Thông tin cần sửa
            <select value={field} onChange={(e) => setField(e.target.value)}>
              <option>Tên / hình ảnh</option>
              {Object.keys(item.spec).map((k) => (
                <option key={k} value={k}>
                  {specLabel(k)}
                </option>
              ))}
              <option>Khác</option>
            </select>
          </label>
          <label>
            Nội dung đề nghị sửa
            <textarea
              required
              minLength={5}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button disabled={busy || note.trim().length < 5}>
            Gửi phản hồi
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            Đóng
          </button>
        </form>
        <p role="status">{message}</p>
      </section>
    </div>
  );
}

type Report = {
  id: string;
  deviceId: string;
  deviceType: string;
  deviceName: string;
  field: string;
  note: string;
  status: string;
};
export function FeedbackInbox({
  devices,
  onOpen,
}: {
  devices: Device[];
  onOpen: (item: Device) => void;
}) {
  const [reports, setReports] = useState<Report[]>([]),
    [error, setError] = useState("");
  const [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState(false);
  useEffect(
    () =>
      onSnapshot(
        collection(firestore, "dataReports"),
        (snap) => {
          setReports(
            snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Report),
          );
          setError("");
        },
        () => setError("Không thể tải phản hồi. Kiểm tra quyền Firestore."),
      ),
    [],
  );
  return (
    <section className="feature-card">
      <h2>Phản hồi dữ liệu</h2>
      <label>
        Trạng thái
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="new">Mới</option>
          <option value="reviewing">Đang kiểm tra</option>
          <option value="resolved">Đã xử lý</option>
        </select>
      </label>
      <p role="status">{error}</p>
      {reports
        .filter((r) => filter === "all" || r.status === filter)
        .map((r) => (
          <article className="feature-card" key={r.id}>
            <h3>{r.deviceName}</h3>
            <strong>{specLabel(r.field)}</strong>
            <p>{r.note}</p>
            <button
              onClick={() => {
                const item = devices.find(
                  (d) => d.id === r.deviceId && deviceType(d) === r.deviceType,
                );
                if (item) onOpen(item);
                else setError("Sản phẩm không còn trong danh sách.");
              }}
            >
              Mở sản phẩm
            </button>
            <select
              aria-label={`Trạng thái phản hồi ${r.deviceName}`}
              disabled={busy}
              value={r.status}
              onChange={async (e) => {
                setBusy(true);
                try {
                  await updateDoc(doc(firestore, "dataReports", r.id), {
                    status: e.target.value,
                  });
                } catch {
                  setError("Không cập nhật được trạng thái.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <option value="new">Mới</option>
              <option value="reviewing">Đang kiểm tra</option>
              <option value="resolved">Đã xử lý</option>
            </select>
          </article>
        ))}
      {!reports.length && !error && <p>Chưa có phản hồi.</p>}
    </section>
  );
}
