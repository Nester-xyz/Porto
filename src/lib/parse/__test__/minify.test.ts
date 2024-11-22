import { Tweet } from "@/types/tweets.type";
import { MinifyTweet } from "../minify";
import { describe, it, expect } from "vitest";

describe("minify Tweets", () => {
  it("send empty array should return empty array", () => {
    expect(MinifyTweet([])).toEqual([]);
  });

  it("should return nothing if no id is passed", () => {
    const INPUT: any[] = [{ a: "hi", b: "hello" }];
    const OUTPUT: Tweet[] = [];

    expect(MinifyTweet(INPUT)).toEqual(OUTPUT);
  });

  it("should return the tweets with only the matching fields", () => {
    const INPUT: any[] = [
      {
        tweet: {
          id: "1",
          created_at: undefined,
          entities: undefined,
          full_text: undefined,
          extended_entities: undefined,
          in_reply_to_screen_name: undefined,
        },
      },
    ];
    const OUTPUT: Tweet[] = [
      {
        tweet: {
          id: "1",
          created_at: undefined,
          entities: undefined,
          full_text: undefined,
          extended_entities: undefined,
          in_reply_to_screen_name: undefined,
        },
      },
    ];

    expect(MinifyTweet(INPUT)).toBe(OUTPUT);
  });
});
