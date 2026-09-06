import { describe, it, expect } from "vitest";
import { translateAuthError } from "../logic/auth-error-translator";

describe("translateAuthError", () => {
  it("translates email not confirmed error correctly", () => {
    const res = translateAuthError({ message: "Email not confirmed" });
    expect(res.title).toBe("Email Belum Dikonfirmasi");
    expect(res.canResend).toBe(true);
  });

  it("translates invalid credentials correctly", () => {
    const res = translateAuthError({ message: "Invalid login credentials" });
    expect(res.title).toBe("Email atau Sandi Salah");
  });

  it("translates user already registered correctly", () => {
    const res = translateAuthError({ message: "User already registered" });
    expect(res.title).toBe("Email Sudah Terdaftar");
  });

  it("translates rate limit correctly", () => {
    const res = translateAuthError({ message: "over_email_send_rate_limit" });
    expect(res.title).toBe("Terlalu Banyak Percobaan");
  });

  it("handles null or undefined safely without throwing", () => {
    const res = translateAuthError(null);
    expect(res.title).toBe("Terjadi kesalahan");
  });
});
