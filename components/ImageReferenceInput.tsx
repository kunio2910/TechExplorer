import type { InputHTMLAttributes } from "react";
export default function ImageReferenceInput(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  const uploaded =
    typeof props.value === "string" && props.value.startsWith("data:image/");
  return (
    <input
      {...props}
      value={uploaded ? "" : props.value}
      readOnly={uploaded || props.readOnly}
      placeholder={
        uploaded
          ? "Ảnh đã tải từ máy — đổi trong thư viện ảnh"
          : props.placeholder
      }
      title={uploaded ? "Thay hoặc xóa ảnh trong Thư viện ảnh." : props.title}
    />
  );
}
