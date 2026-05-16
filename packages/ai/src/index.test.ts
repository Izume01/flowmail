import { expect, test, mock, describe, beforeEach } from "bun:test";
import { getDeliverabilityScore, improveEmailContent, analyzeSentiment } from "./index";

let mockResponseText = JSON.stringify({
  score: 85,
  recommendations: ["Avoid all caps"],
  spam_triggers: ["FREE"],
});

mock.module("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = {
        create: async () => {
          return {
            content: [
              {
                type: "text",
                text: mockResponseText,
              },
            ],
          };
        },
      };
    },
  };
});

describe("AI Package", () => {
  describe("getDeliverabilityScore", () => {
    test("should return parsed deliverability score", async () => {
      mockResponseText = JSON.stringify({
        score: 85,
        recommendations: ["Avoid all caps"],
        spam_triggers: ["FREE"],
      });
      const result = await getDeliverabilityScore("fake-key", "Test Subject", "Test Body");
      
      expect(result).toEqual({
        score: 85,
        recommendations: ["Avoid all caps"],
        spam_triggers: ["FREE"],
      });
    });

    test("should throw error if JSON parsing fails", async () => {
      mockResponseText = "invalid json";

      await expect(getDeliverabilityScore("fake-key", "Test", "Test")).rejects.toThrow("Failed to parse AI deliverability score");
    });
  });

  describe("improveEmailContent", () => {
    test("should return parsed improvement result", async () => {
      mockResponseText = JSON.stringify({
        optimized_subject: "Better Subject",
        optimized_body: "Better Body",
        explanation: "Changed some words",
      });
      const result = await improveEmailContent("fake-key", "Original Subject", "Original Body");
      
      expect(result).toEqual({
        optimized_subject: "Better Subject",
        optimized_body: "Better Body",
        explanation: "Changed some words",
      });
    });

    test("should throw error if JSON parsing fails", async () => {
      mockResponseText = "invalid json";

      await expect(improveEmailContent("fake-key", "Test", "Test")).rejects.toThrow("Failed to parse AI improvement result");
    });
  });

  describe("analyzeSentiment", () => {
    test("should return parsed sentiment result", async () => {
      mockResponseText = JSON.stringify({
        sentiment: "positive",
        score: 0.9,
        intent: "informational",
      });
      const result = await analyzeSentiment("fake-key", "Test Content");
      
      expect(result).toEqual({
        sentiment: "positive",
        score: 0.9,
        intent: "informational",
      });
    });

    test("should throw error if JSON parsing fails", async () => {
      mockResponseText = "invalid json";

      await expect(analyzeSentiment("fake-key", "Test")).rejects.toThrow("Failed to parse AI sentiment analysis");
    });
  });
});
