import { cookies } from "next/headers";

const SECRET_KEY = process.env.SESSION_SECRET || "kasmu-super-secret-key-offline-atm-2026";
export const SESSION_COOKIE_NAME = "kasmu_session";

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: "OWNER" | "STAFF";
  exp: number;
}

// Convert string to BufferSource for Web Crypto API
function stringToBufferSource(str: string): BufferSource {
  return new TextEncoder().encode(str) as unknown as BufferSource;
}

// Base64Url encode/decode
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
}

// Generate HMAC Key
async function getCryptoKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    stringToBufferSource(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Create Signed Session Token
export async function createSessionToken(
  user: { id: string; username: string; name: string; role: string },
  expiresInSeconds: number = 86400 * 7 // 7 hari
): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role === "OWNER" ? "OWNER" : "STAFF",
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = base64UrlEncode(new TextEncoder().encode(payloadStr).buffer);

  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    stringToBufferSource(payloadBase64)
  );
  const signatureBase64 = base64UrlEncode(signatureBuffer);

  return `${payloadBase64}.${signatureBase64}`;
}

// Verify Session Token
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadBase64, signatureBase64] = parts;

    // Decode signature
    const binarySignature = base64UrlDecode(signatureBase64);
    const signatureBytes = new Uint8Array(binarySignature.length);
    for (let i = 0; i < binarySignature.length; i++) {
      signatureBytes[i] = binarySignature.charCodeAt(i);
    }

    const key = await getCryptoKey();
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as BufferSource,
      stringToBufferSource(payloadBase64)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(payloadBase64);
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

// Helper to get session from request cookies in Server Components / API
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}
