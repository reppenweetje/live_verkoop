import { NextRequest, NextResponse } from "next/server";
import { getUsers, signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email?.toLowerCase() && u.password === password
  );

  if (!user) {
    return NextResponse.json(
      { error: "Ongeldig e-mailadres of wachtwoord" },
      { status: 401 }
    );
  }

  const token = await signToken({ name: user.name, email: user.email });

  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dagen
    path: "/",
  });

  return res;
}
