export const categoryLabel = (value: string) =>
  ({
    "Power Supply": "Nguồn máy tính",
    PSU: "Bộ nguồn (PSU)",
    Cooling: "Tản nhiệt",
    Peripherals: "Thiết bị ngoại vi",
    Networking: "Thiết bị mạng",
    Storage: "Ổ lưu trữ (SSD)",
    Case: "Vỏ máy (Case)",
    Other: "Khác",
    Laptop: "Máy tính xách tay (Laptop)",
  })[value] ?? value;
