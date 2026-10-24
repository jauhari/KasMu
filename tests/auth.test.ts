import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";

describe("Authentication & Token Security", () => {
  it("should create and verify a valid session token", async () => {
    const user = {
      id: "user-123",
      username: "owner",
      name: "Owner Toko",
      role: "OWNER",
    };

    const token = await createSessionToken(user, 3600);
    expect(typeof token).toBe("string");
    expect(token.includes(".")).toBe(true);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-123");
    expect(verified?.role).toBe("OWNER");
    expect(verified?.name).toBe("Owner Toko");
  });

  it("should reject tampered tokens", async () => {
    const user = {
      id: "user-456",
      username: "kasir1",
      name: "Kasir Kris",
      role: "STAFF",
    };

    const token = await createSessionToken(user, 3600);
    const tamperedToken = token.slice(0, -4) + "XXXX";

    const verified = await verifySessionToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it("should reject expired tokens", async () => {
    const user = {
      id: "user-789",
      username: "kasir1",
      name: "Kasir Kris",
      role: "STAFF",
    };

    // Expired immediately (-10 seconds)
    const token = await createSessionToken(user, -10);
    const verified = await verifySessionToken(token);
    expect(verified).toBeNull();
  });
});
