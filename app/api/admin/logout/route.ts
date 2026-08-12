import { adminCookieOptions } from "../../../lib/admin-auth";
import { adminRedirect, isSameOrigin } from "../../../lib/admin-request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return adminRedirect("/admin", request);
  const response = adminRedirect("/admin/login", request);
  response.cookies.set({ ...adminCookieOptions(), value: "", maxAge: 0 });
  return response;
}
