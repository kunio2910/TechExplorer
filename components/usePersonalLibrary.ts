"use client";
import { useEffect, useState } from "react";
import { deviceType, type Device } from "@/lib/catalog-tools";
export const deviceKey = (device: Device) =>
  `${deviceType(device)}:${device.id}`;
type Library = { favorites: string[]; recent: { key: string; at: string }[] };
const empty: Library = { favorites: [], recent: [] };
export default function usePersonalLibrary() {
  const [library, setLibrary] = useState<Library>(empty);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("tech-explorer-personal-v1") ?? "null",
      );
      if (
        saved &&
        Array.isArray(saved.favorites) &&
        Array.isArray(saved.recent)
      )
        setLibrary({
          favorites: saved.favorites
            .filter((x: unknown) => typeof x === "string")
            .slice(0, 500),
          recent: saved.recent
            .filter(
              (x: { key?: unknown; at?: unknown }) =>
                typeof x?.key === "string" && typeof x?.at === "string",
            )
            .slice(0, 30),
        });
    } catch {
      setStorageError("Không thể đọc dữ liệu đã lưu trên trình duyệt.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "tech-explorer-personal-v1",
          JSON.stringify(library),
        );
      } catch {
        setStorageError(
          "Trình duyệt không cho lưu. Yêu thích và lịch sử chỉ được giữ trong phiên này.",
        );
      }
  }, [library, ready]);
  return {
    library,
    ready,
    storageError,
    removeFavorite: (key: string) =>
      setLibrary((current) => ({
        ...current,
        favorites: current.favorites.filter((x) => x !== key),
      })),
    toggleFavorite: (item: Device) => {
      const key = deviceKey(item);
      setLibrary((current) => ({
        ...current,
        favorites: current.favorites.includes(key)
          ? current.favorites.filter((x) => x !== key)
          : [...current.favorites, key],
      }));
    },
    recordView: (item: Device) => {
      const key = deviceKey(item);
      setLibrary((current) => ({
        ...current,
        recent: [
          { key, at: new Date().toISOString() },
          ...current.recent.filter((x) => x.key !== key),
        ].slice(0, 30),
      }));
    },
    clearHistory: () => setLibrary((current) => ({ ...current, recent: [] })),
  };
}
