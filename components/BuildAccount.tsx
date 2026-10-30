"use client";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase-client";
import { validateBuild, type PcBuild } from "@/lib/pc-build";
export default function BuildAccount({
  saved,
  onImport,
}: {
  saved: PcBuild[];
  onImport: (items: PcBuild[]) => void;
}) {
  const [user, setUser] = useState<User | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [register, setRegister] = useState(false);
  const [remote, setRemote] = useState<PcBuild[]>([]);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setRemote([]);
      }),
    [],
  );
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch {
      setMessage(
        "Thao tác chưa thành công. Kiểm tra tài khoản, kết nối và quyền Firestore.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="feature-card">
      <summary>Tài khoản và cấu hình đám mây</summary>
      {user ? (
        <>
          <p>{user.email}</p>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await signOut(auth);
              })
            }
          >
            Đăng xuất
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const result = await getDocs(
                  collection(firestore, "users", user.uid, "builds"),
                );
                setRemote(
                  result.docs.flatMap((d) => {
                    try {
                      return [validateBuild(d.data())];
                    } catch {
                      return [];
                    }
                  }),
                );
                setMessage("Đã tải cấu hình tài khoản.");
              })
            }
          >
            Tải danh sách đám mây
          </button>
          <p>Lưu từng cấu hình lên tài khoản để mở trên thiết bị khác.</p>
          {saved.map((b) => (
            <div key={b.id}>
              {b.name}{" "}
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await setDoc(
                      doc(firestore, "users", user.uid, "builds", b.id),
                      validateBuild(b),
                    );
                    setMessage(`Đã lưu ${b.name} lên tài khoản.`);
                  })
                }
              >
                Lưu lên tài khoản
              </button>
            </div>
          ))}
          {remote.map((b) => (
            <div key={b.id}>
              {b.name}{" "}
              <button
                disabled={busy}
                onClick={() => {
                  onImport([{ ...b, id: crypto.randomUUID() }]);
                  setMessage("Đã thêm bản sao vào danh sách trên máy.");
                }}
              >
                Nhập bản sao về máy
              </button>
            </div>
          ))}
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await (
                register
                  ? createUserWithEmailAndPassword
                  : signInWithEmailAndPassword
              )(auth, email, password);
              setPassword("");
            });
          }}
        >
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              required
              minLength={6}
              autoComplete={register ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={register}
              onChange={(e) => setRegister(e.target.checked)}
            />
            Tạo tài khoản mới
          </label>
          <button disabled={busy}>{register ? "Đăng ký" : "Đăng nhập"}</button>
        </form>
      )}
      <p role="status">{message}</p>
    </details>
  );
}
