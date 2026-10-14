"use client";
import { useEffect, useState, useRef } from "react";
import type { Device } from "@/lib/catalog-tools";
import { deviceType } from "@/lib/catalog-tools";
import {
  deleteLocalDraft,
  draftKey,
  listLocalDrafts,
  saveLocalDraft,
  type LocalDraft,
} from "@/lib/draft-store";
export default function AdminRecovery({
  uid,
  item,
  dirty,
  onRecover,
  disabled = false,
}: {
  uid: string;
  item: Device;
  dirty: boolean;
  onRecover: (item: Device) => void;
  disabled?: boolean;
}) {
  const [drafts, setDrafts] = useState<LocalDraft[]>([]),
    [status, setStatus] = useState(""),
    [loaded, setLoaded] = useState(false);
  const currentRef = useRef({ uid, item, dirty });
  currentRef.current = { uid, item, dirty };
  const blocked = useRef(new Set<string>());
  async function refresh() {
    try {
      const list = await listLocalDrafts(uid);
      setDrafts(list);
      return list;
    } catch {
      setStatus("Không thể mở kho bản nháp trên trình duyệt.");
      return [];
    }
  }
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    listLocalDrafts(uid)
      .then((list) => {
        if (cancelled) return;
        blocked.current = new Set(list.map((x) => x.key));
        setDrafts(list);
        setLoaded(true);
      })
      .catch(() => {
        setStatus("Không thể đọc bản nháp trên trình duyệt.");
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);
  useEffect(() => {
    if (!loaded) return;
    const key = draftKey(uid, deviceType(item), item.id);
    if (blocked.current.has(key)) return;
    if (dirty) setStatus("Đang tự lưu bản nháp…");
    const timeout = setTimeout(async () => {
      try {
        if (dirty) {
          await saveLocalDraft({
            key,
            uid,
            type: deviceType(item),
            item,
            at: new Date().toISOString(),
          });
          setStatus("Đã tự lưu bản nháp trên trình duyệt.");
        } else {
          await deleteLocalDraft(key);
          setStatus("");
        }
        await refresh();
      } catch {
        setStatus(
          "Không thể tự lưu bản nháp. Hãy lưu lên Firestore trước khi đóng trang.",
        );
      }
    }, 500);
    return () => {
      clearTimeout(timeout);
      // Persist the last edit even when switching records before the debounce.
      if (dirty && !blocked.current.has(key))
        void saveLocalDraft({
          key,
          uid,
          type: deviceType(item),
          item,
          at: new Date().toISOString(),
        }).catch(() => {});
    };
  }, [uid, item, dirty, loaded]);
  useEffect(() => {
    const flush = () => {
      const c = currentRef.current,
        k = draftKey(c.uid, deviceType(c.item), c.item.id);
      if (c.dirty && !blocked.current.has(k))
        void saveLocalDraft({
          key: k,
          uid: c.uid,
          type: deviceType(c.item),
          item: c.item,
          at: new Date().toISOString(),
        }).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);
  return (
    <section className="admin-recovery feature-card">
      <strong>Khôi phục bản nháp</strong>
      <p role="status">
        {status ||
          "Bản nháp được lưu riêng cho tài khoản này trên trình duyệt. Chỉ nút Lưu lên Firestore mới cập nhật trang chủ."}
      </p>
      {drafts
        .filter(
          (draft) =>
            blocked.current.has(draft.key) ||
            draft.key !== draftKey(uid, deviceType(item), item.id),
        )
        .map((draft) => (
          <div className="draft-row" key={draft.key}>
            <span>
              {draft.item.name}
              <small>
                {draft.type} · {new Date(draft.at).toLocaleString("vi-VN")}
              </small>
            </span>
            <button
              disabled={disabled}
              onClick={() => {
                if (
                  dirty &&
                  !confirm("Khôi phục bản nháp và thay dữ liệu đang sửa?")
                )
                  return;
                blocked.current.delete(draft.key);
                onRecover(draft.item);
                setStatus(
                  "Đã khôi phục. Kiểm tra dữ liệu và lưu lên Firestore khi sẵn sàng.",
                );
              }}
            >
              Khôi phục bản nháp {draft.type}
            </button>
            <button
              disabled={disabled}
              onClick={async () => {
                if (!confirm(`Bỏ bản nháp “${draft.item.name}”?`)) return;
                await deleteLocalDraft(draft.key);
                blocked.current.delete(draft.key);
                await refresh();
              }}
            >
              Bỏ bản nháp
            </button>
          </div>
        ))}
    </section>
  );
}
