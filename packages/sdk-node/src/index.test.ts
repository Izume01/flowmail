import { describe, it, expect, spyOn, beforeEach } from "bun:test";
import { FlowMail } from "./index";

describe("FlowMail SDK", () => {
  const apiKey = "test-api-key";
  const sdk = new FlowMail({ apiKey, baseUrl: "http://localhost:3001" });

  beforeEach(() => {
    // Reset any mocks if necessary
  });

  it("should initialize with string config", () => {
    const sdkStr = new FlowMail(apiKey);
    expect(sdkStr).toBeInstanceOf(FlowMail);
  });

  it("should initialize with object config", () => {
    expect(sdk).toBeInstanceOf(FlowMail);
  });

  it("should send an email", async () => {
    const mockResponse = { id: "email-id-123" };
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const payload = {
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    };

    const result = await sdk.sendEmail(payload);

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3001/emails",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        }),
      })
    );
    expect(result).toEqual(mockResponse);
    
    fetchSpy.mockRestore();
  });

  it("should trigger an event", async () => {
    const mockResponse = { message: "Triggered 1 flow(s)", triggeredCount: 1 };
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const event = "user_signed_up";
    const data = { userId: "user-123" };

    const result = await sdk.triggerEvent(event, data);

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3001/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ event, data }),
      })
    );
    expect(result).toEqual(mockResponse as any);

    fetchSpy.mockRestore();
  });

  it("should throw error on non-ok response", async () => {
    const errorResponse = { message: "Invalid API key" };
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(errorResponse), { status: 401, statusText: "Unauthorized" })
    );

    await expect(sdk.triggerEvent("test", {})).rejects.toThrow("FlowMail SDK Error: Invalid API key");

    fetchSpy.mockRestore();
  });

  it("should identify a user", async () => {
    const mockResponse = { id: "contact-1", email: "test@example.com" };
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const payload = {
      email: "test@example.com",
      firstName: "John",
      attributes: { role: "admin" }
    };

    const result = await sdk.identify(payload);

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3001/audience/identify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result).toEqual(mockResponse);

    fetchSpy.mockRestore();
  });

  it("should track a user event", async () => {
    const mockResponse = { id: "event-1" };
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const payload = {
      email: "test@example.com",
      event_name: "button_clicked",
      properties: { button: "signup" }
    };

    const result = await sdk.track(payload);

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3001/audience/track",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(result).toEqual(mockResponse);

    fetchSpy.mockRestore();
  });
});
