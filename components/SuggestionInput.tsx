"use client";
import { useId, useState } from "react";
export default function SuggestionInput({
  value,
  options,
  onChange,
  onBlur,
  label,
  multiple = false,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
  label: string;
  multiple?: boolean;
}) {
  const id = useId(),
    [open, setOpen] = useState(false),
    [cursor, setCursor] = useState(0),
    [query, setQuery] = useState("");
  const matches = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase()),
  );
  const choices = [
    ...matches,
    ...(query.trim() && !matches.includes(query.trim()) ? [query.trim()] : []),
  ];
  function choose(v: string) {
    const next = multiple
      ? [
          ...new Set([
            ...value
              .split(/[,;]+/)
              .map((s) => s.trim())
              .filter(Boolean),
            v,
          ]),
        ].join(", ")
      : v;
    onBlur(next);
    setOpen(false);
    setQuery("");
  }
  return (
    <div className="suggestion-control">
      <div style={{ display: "flex" }}>
        <input
          aria-label={label}
          role="combobox"
          aria-expanded={open}
          aria-controls={id}
          aria-autocomplete="list"
          aria-activedescendant={
            open && choices.length
              ? `${id}-${Math.min(cursor, choices.length - 1)}`
              : undefined
          }
          value={open ? query : value}
          onFocus={() => setQuery(multiple ? "" : value)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setCursor(0);
            if (!multiple) onChange(e.target.value);
          }}
          onBlur={() => {
            if (!multiple) onBlur(open ? query : value);
            setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setCursor((c) => Math.min(c + 1, choices.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            }
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && open && choices.length) {
              e.preventDefault();
              choose(choices[Math.max(0, cursor)]);
            }
          }}
        />
        <button
          type="button"
          aria-label={`Gợi ý ${label}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery("");
            setCursor(0);
            setOpen(!open);
          }}
        >
          ▾
        </button>
      </div>
      {open && (
        <div
          id={id}
          role="listbox"
          style={{ maxHeight: 200, overflowY: "auto" }}
        >
          {choices.map((v, i) => (
            <button
              type="button"
              role="option"
              id={`${id}-${i}`}
              aria-selected={i === cursor}
              key={v}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(v)}
            >
              {options.includes(v) ? v : `Dùng giá trị tự nhập: ${v}`}
            </button>
          ))}
        </div>
      )}
      {multiple && value && (
        <div className="feature-actions">
          {value
            .split(/[,;]+/)
            .filter(Boolean)
            .map((v) => (
              <button
                type="button"
                key={v}
                aria-label={`Bỏ ${v.trim()}`}
                onClick={() =>
                  onChange(
                    value
                      .split(/[,;]+/)
                      .filter((s) => s !== v)
                      .join(", "),
                  )
                }
              >
                {v.trim()} ×
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
