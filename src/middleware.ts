// Auth bypassed for local development
// To re-enable: restore clerkMiddleware from git history

import { NextResponse } from "next/server";

export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
