import { timingSafeEqual } from "node:crypto";
export function authorized(request: Request) {
  const token = process.env.ADMIN_TOKEN;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  return (
    !!token &&
    !!supplied &&
    Buffer.byteLength(token) === Buffer.byteLength(supplied) &&
    timingSafeEqual(Buffer.from(token), Buffer.from(supplied))
  );
}
