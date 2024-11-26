import { Tweet } from "@/types/tweets";
import { MinifyTweet } from "../minify";
import { describe, it, expect } from "vitest";

describe("MinifyTweet", () => {
  it("should return an empty array when the input is an empty array", () => {
    expect(MinifyTweet([])).toEqual([]);
  });

  it("should return an empty array if input objects do not contain a valid tweet object", () => {
    const INPUT: unknown[] = [{ a: "hi", b: "hello" }];
    const OUTPUT: Tweet[] = [];
    expect(MinifyTweet(INPUT)).toEqual(OUTPUT);
  });

  it("should return the tweet when it contains a valid id", () => {
    const INPUT: unknown[] = [
      {
        tweet: {
          id: "1",
          created_at: "2023-01-01T00:00:00Z",
          entities: { urls: [] },
          full_text: "Hello world!",
          extended_entities: { media: [{ type: "photo", media_url: "url" }] },
        },
      },
    ];
    const OUTPUT: Tweet[] = [
      {
        tweet: {
          id: "1",
          created_at: "2023-01-01T00:00:00Z",
          entities: { urls: [] },
          full_text: "Hello world!",
          extended_entities: { media: [{ type: "photo", media_url: "url" }] },
        },
      },
    ];
    expect(MinifyTweet(INPUT)).toEqual(OUTPUT);
  });

  it("should exclude tweets that do not have a valid id", () => {
    const INPUT: unknown[] = [
      {
        tweet: {
          created_at: "2023-01-01T00:00:00Z",
          entities: { urls: [] },
          full_text: "Missing id!",
        },
      },
      {
        tweet: {
          id: "2",
          created_at: "2023-01-01T00:00:00Z",
          entities: { urls: [] },
          full_text: "Valid tweet!",
        },
      },
    ];
    const OUTPUT: Tweet[] = [
      {
        tweet: {
          id: "2",
          created_at: "2023-01-01T00:00:00Z",
          entities: { urls: [] },
          full_text: "Valid tweet!",
          in_reply_to_screen_name: undefined,
          extended_entities: undefined,
        },
      },
    ];
    expect(MinifyTweet(INPUT)).toEqual(OUTPUT);
  });

  it("should handle tweets with optional fields correctly", () => {
    const INPUT: unknown[] = [
      {
        tweet: {
          id: "3",
          created_at: "2023-01-01T00:00:00Z",
          full_text: "Optional fields missing!",
          extended_entities: undefined,
        },
      },
    ];
    const OUTPUT: Tweet[] = [
      {
        tweet: {
          id: "3",
          created_at: "2023-01-01T00:00:00Z",
          entities: undefined,
          full_text: "Optional fields missing!",
          extended_entities: undefined,
          in_reply_to_screen_name: undefined,
        },
      },
    ];
    expect(MinifyTweet(INPUT)).toEqual(OUTPUT);
  });
});
