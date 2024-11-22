import { expect, it, describe } from "vitest";
import { parseTweetsFile } from "../parse";

const MOCKDATA = `window.YTD.tweets.part0 = [
{
  "tweet": {
    "entities": {
      "user_mentions": [
        {
          "name": "random",
          "screen_name": "random",
          "indices": ["3", "11"],
          "id_str": "1123123123",
          "id": "1123123123"
        }
      ],
      "urls": [],
      "symbols": [],
      "hashtags": []
    },
    "id_str": "12312313123",
    "id": "12312313123",
    "created_at": "Sat Oct 19 04:08:43 +0000 2024",
    "favorited": false,
    "full_text": "text",
    "lang": "en"
  }
}]`;

const OUTPUT = [
  {
    tweet: {
      entities: {
        user_mentions: [
          {
            name: "random",
            screen_name: "random",
            indices: ["3", "11"],
            id_str: "1123123123",
            id: "1123123123",
          },
        ],
        urls: [],
        symbols: [],
        hashtags: [],
      },
      id_str: "12312313123",
      id: "12312313123",
      created_at: "Sat Oct 19 04:08:43 +0000 2024",
      favorited: false,
      full_text: "text",
      lang: "en",
    },
  },
];

describe("Parse Tweets", () => {
  it("parses tweets file and returns json", () => {
    expect(parseTweetsFile(MOCKDATA)).toEqual(OUTPUT);
  });

  it("throws error for invalid JSON", () => {
    expect(() => parseTweetsFile("invalid data")).toThrow(
      "Failed to parse tweets file",
    );
  });
});
