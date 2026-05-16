import { expect, test, describe } from "bun:test";
import { sendEmailSchema } from "./schemas";

describe("sendEmailSchema", () => {
  test("validates a correct email request", () => {
    const payload = {
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    };
    const result = sendEmailSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  test("fails on invalid email", () => {
    const payload = {
      from: "invalid-email",
      to: "recipient@example.com",
      subject: "Test Subject",
    };
    const result = sendEmailSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  test("passes on missing subject (auto-selection support)", () => {
    const payload = {
      from: "sender@example.com",
      to: "recipient@example.com",
    };
    // @ts-ignore
    const result = sendEmailSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
