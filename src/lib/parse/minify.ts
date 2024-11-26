import { Tweet } from "@/types/tweets";

export const MinifyTweet = (fields: unknown[]): Tweet[] => {
  const validTweets = fields
    .filter((field): field is { tweet: Tweet["tweet"] } => {
      return (
        typeof field === "object" &&
        field !== null &&
        "tweet" in field &&
        typeof (field as { tweet: Tweet["tweet"] }).tweet.id === "string"
      );
    })
    .map(({ tweet }) => {
      return {
        tweet: {
          id: tweet.id,
          created_at: tweet.created_at,
          entities: tweet.entities,
          full_text: tweet.full_text,
          in_reply_to_screen_name: tweet.in_reply_to_screen_name,
          extended_entities: tweet.extended_entities,
        },
      };
    });

  return validTweets;
};
