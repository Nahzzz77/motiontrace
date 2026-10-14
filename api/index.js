import { handleFormApi } from "../server/form-api.mjs";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/api/index"
      ? `/api/${url.searchParams.get("route") || ""}`
      : url.pathname;
    const headers = Object.fromEntries(request.headers);
    if (Number(headers["content-length"]) > 100_000) {
      return Response.json({ error: "请求内容过大" }, { status: 413 });
    }
    try {
      const rawBody = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
      if (Buffer.byteLength(rawBody, "utf8") > 100_000) {
        return Response.json({ error: "请求内容过大" }, { status: 413 });
      }
      const result = await handleFormApi({
        method: request.method,
        pathname,
        headers,
        rawBody,
        secure: true,
      });
      return new Response(request.method === "HEAD" ? null : result.body, {
        status: result.status,
        headers: result.headers,
      });
    } catch {
      return Response.json({ error: "服务暂时不可用" }, { status: 500 });
    }
  },
};
