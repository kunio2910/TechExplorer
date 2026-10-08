import { authorized } from "@/lib/auth";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ error: "Admin token required." }, { status: 401 });
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || file.size > 8 * 1024 * 1024)
    return Response.json(
      { error: "Upload an image under 8 MB." },
      { status: 400 },
    );
  const types: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const ext = types[file.type];
  if (!ext)
    return Response.json(
      { error: "Use PNG, JPEG, WebP or AVIF." },
      { status: 400 },
    );
  const dir = path.join(process.cwd(), "public/uploads");
  await mkdir(dir, { recursive: true });
  const name = randomUUID() + "." + ext;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: "/api/media/" + name });
}
