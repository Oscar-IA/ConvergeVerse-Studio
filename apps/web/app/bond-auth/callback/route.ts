import { NextRequest, NextResponse } from "next/server";
import {
  SATELLITE_SESSION_COOKIE,
  verifySatelliteToken,
  satelliteCookieOptions,
} from "@/lib/bond-central";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const centralRaw = req.nextUrl.searchParams.get("central") ?? "";
  const redirect = req.nextUrl.searchParams.get("redirect") ?? "/";

  if (!token || token.length > 2048) return authError(req, "missing_token");

  let centralUrl: string;
  try {
    const parsed = new URL(centralRaw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    centralUrl = parsed.origin;
  } catch {
    return authError(req, "invalid_central_url");
  }

  const payload = await verifySatelliteToken(token, centralUrl);
  if (!payload) return authError(req, "token_invalid");

  const safePath = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  const res = NextResponse.redirect(new URL(safePath, req.nextUrl));
  res.cookies.set(SATELLITE_SESSION_COOKIE, token, satelliteCookieOptions());
  res.cookies.set("bond_central_url", centralUrl, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return res;
}

function authError(req: NextRequest, reason: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/bond-auth";
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
