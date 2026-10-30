"use client";
import { useEffect, useRef, useState } from "react";
export default function useActionDialog() {
  const [request, setRequest] = useState<{
      title: string;
      input: boolean;
    } | null>(null),
    [value, setValue] = useState("");
  const resolve = useRef<((v: string | null) => void) | null>(null),
    dialog = useRef<HTMLDialogElement>(null);
  function finish(v: string | null) {
    resolve.current?.(v);
    resolve.current = null;
    setRequest(null);
  }
  useEffect(() => {
    if (request) dialog.current?.showModal();
  }, [request]);
  useEffect(
    () => () => {
      resolve.current?.(null);
    },
    [],
  );
  function ask(title: string, input = false): Promise<string | null> {
    resolve.current?.(null);
    setValue("");
    setRequest({ title, input });
    return new Promise((r) => {
      resolve.current = r;
    });
  }
  const modal = request ? (
    <dialog
      ref={dialog}
      className="info-dialog"
      onCancel={(e) => {
        e.preventDefault();
        finish(null);
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          finish(request.input ? value.trim() : "yes");
        }}
      >
        <h2>{request.title}</h2>
        {request.input && (
          <label>
            Giá trị
            <input
              autoFocus
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        )}
        <button type="button" onClick={() => finish(null)}>
          Hủy
        </button>
        <button
          autoFocus={!request.input}
          disabled={request.input && !value.trim()}
        >
          Xác nhận
        </button>
      </form>
    </dialog>
  ) : null;
  return { ask, modal };
}
