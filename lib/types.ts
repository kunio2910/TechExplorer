export const mediaRoles = [
  "main",
  "top",
  "angle",
  "rear_io",
  "socket",
  "ram",
  "m2",
  "xray",
  "exploded",
] as const;
export type MediaRole = (typeof mediaRoles)[number];
export type Hotspot = {
  id: string;
  type: string;
  view: string;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  description: string;
};
export type AssociatedComponent = {
  id: string;
  category:
    "CPU" | "RAM" | "GPU" | "Storage" | "PSU" | "Cooling" | "Case" | "Other";
  name: string;
  model: string;
  compatibility: "compatible" | "warning" | "incompatible";
  notes: string;
};
export type CatalogComponentType = "CPU" | "RAM" | "SSD" | "GPU" | "PSU";
export type CatalogComponent = AssociatedComponent & {
  type: CatalogComponentType;
  brand: string;
  imageUrl?: string;
  description: string;
  spec: Record<string, string>;
  status: "draft" | "published";
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  sourceUrl?: string;
  status: "draft" | "published";
  spec: Record<string, string>;
  media: Partial<Record<MediaRole, string>>;
  hotspots: Hotspot[];
  components: AssociatedComponent[];
};
