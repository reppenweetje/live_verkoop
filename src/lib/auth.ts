import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "repp_auth";
const JWT_EXPIRY = "7d";

export interface AuthUser {
  name: string;
  email: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is niet geconfigureerd");
  return new TextEncoder().encode(secret);
}

export function getUsers(): Array<AuthUser & { password: string }> {
  const raw = process.env.AUTH_USERS ?? "";
  return raw.split(",").flatMap((entry) => {
    const [name, email, password] = entry.trim().split("|");
    if (!name || !email || !password) return [];
    return [{ name, email, password }];
  });
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
