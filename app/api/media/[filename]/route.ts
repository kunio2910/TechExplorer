import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!/^[a-f0-9-]+\.(png|jpg|webp|avif)$/.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(
      path.join(process.cwd(), "public/uploads", filename),
    );
    const ext = filename.split(".").pop();
    return new Response(data, {
      headers: {
        "Content-Type": ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
