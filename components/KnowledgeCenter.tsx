"use client";
import { useState } from "react";
const articles = [
  {
    title: "Chọn CPU và bo mạch chủ (Mainboard)",
    term: "CPU · Socket · Chipset · BIOS",
    text: "Socket là giao tiếp cơ học và điện giữa CPU với bo mạch chủ. Cùng socket chưa đủ để kết luận tương thích: hãy tra danh sách CPU được hỗ trợ và phiên bản BIOS tối thiểu của đúng model bo mạch.",
    steps: [
      "Xác định model CPU và socket.",
      "Tra danh sách hỗ trợ CPU trên trang nhà sản xuất.",
      "Đối chiếu phiên bản BIOS đang cài và hướng dẫn cập nhật.",
    ],
  },
  {
    title: "Bộ nhớ trong (RAM)",
    term: "DDR4 · DDR5 · DIMM · QVL · XMP · EXPO",
    text: "RAM giữ dữ liệu đang được CPU xử lý. DDR4 và DDR5 khác giao tiếp, không thể thay thế trực tiếp cho nhau. QVL là danh sách bộ nhớ đã được nhà sản xuất kiểm thử. XMP/EXPO là cấu hình ép xung, tốc độ thực tế phụ thuộc CPU, bo mạch và bộ RAM.",
    steps: [
      "Chọn đúng chuẩn DDR và dung lượng.",
      "Đối chiếu số thanh, số khe và RAM tối đa.",
      "Lắp vào khe khuyến nghị trong sách hướng dẫn; ưu tiên một bộ RAM đồng nhất.",
    ],
  },
  {
    title: "Ổ lưu trữ (SSD)",
    term: "M.2 · SATA · NVMe · PCIe",
    text: "M.2 là dạng kết nối và kích thước, còn NVMe là giao thức truyền dữ liệu thường dùng trên PCIe. Không phải mọi ổ M.2 đều dùng NVMe. Khe SSD có thể chia sẻ đường truyền (lane) hoặc làm vô hiệu một cổng SATA khác.",
    steps: [
      "Kiểm tra giao tiếp SATA hay NVMe.",
      "Đối chiếu kích thước ổ và chuẩn khe M.2.",
      "Xem bảng chia sẻ lane, tháo màng bảo vệ miếng dẫn nhiệt trước khi gắn tản nhiệt.",
    ],
  },
  {
    title: "Card đồ họa (GPU)",
    term: "PCIe x16 · VRAM · Đầu cấp nguồn",
    text: "GPU xử lý hình ảnh và tác vụ tính toán song song. VRAM là bộ nhớ dành cho GPU. Ngoài khe PCIe, cần kiểm tra chiều dài, độ dày card, khoảng trống vỏ máy và loại đầu cấp nguồn.",
    steps: [
      "Đối chiếu khe PCIe và kích thước card.",
      "Kiểm tra mức nguồn đề xuất của nhà sản xuất GPU.",
      "Dùng đúng cáp và cắm đầu nguồn chắc chắn theo hướng dẫn.",
    ],
  },
  {
    title: "Bộ nguồn (PSU) và công suất",
    term: "W · TDP · Hiệu suất · Modular",
    text: "TDP không phải mức tiêu thụ điện tối đa của cả máy. Ước tính theo TDP chỉ là bước tham khảo. Chứng nhận hiệu suất không thay thế thông tin về chất lượng, khả năng bảo vệ và đầu kết nối.",
    steps: [
      "Đối chiếu yêu cầu nguồn của CPU/GPU.",
      "Kiểm tra công suất, đầu cắm và khả năng đáp ứng tải tức thời.",
      "Không dùng lẫn cáp nguồn tháo rời của các bộ nguồn nếu nhà sản xuất chưa xác nhận.",
    ],
  },
  {
    title: "Khám phá bo mạch và lắp máy",
    term: "VRM · Chipset · Hotspot · ESD",
    text: "VRM điều chỉnh điện cấp cho linh kiện, chipset phục vụ các kết nối mở rộng. Các điểm chú thích (hotspot) trên Tech Explorer giúp xác định từng khu vực của bo mạch.",
    steps: [
      "Ngắt nguồn và làm theo hướng dẫn chống tĩnh điện của nhà sản xuất.",
      "Dùng hình ảnh và hotspot để nhận diện socket, RAM, PCIe, M.2 và cổng I/O.",
      "Kiểm tra lại cáp nguồn và vị trí lắp trước khi bật máy.",
    ],
  },
];
export default function KnowledgeCenter() {
  const [query, setQuery] = useState("");
  const matches = articles.filter((x) =>
    `${x.title} ${x.term} ${x.text}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <main className="feature-workspace knowledge-workspace">
      <span className="eyebrow">KIẾN THỨC PHẦN CỨNG</span>
      <h1>Trung tâm kiến thức</h1>
      <p>
        Giải thích tiếng Việt, giữ thuật ngữ kỹ thuật để dễ tra cứu tài liệu.
      </p>
      <label>
        Tìm thuật ngữ hoặc chủ đề
        <input
          placeholder="Ví dụ: NVMe, VRM, QVL…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="knowledge-grid">
        {matches.map((article) => (
          <article className="feature-card" key={article.title}>
            <h2>{article.title}</h2>
            <span className="knowledge-terms">{article.term}</span>
            <p>{article.text}</p>
            <details>
              <summary>Các bước cần kiểm tra</summary>
              <ol>
                {article.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          </article>
        ))}
      </div>
      {!matches.length && <p>Không tìm thấy chủ đề phù hợp.</p>}
    </main>
  );
}
