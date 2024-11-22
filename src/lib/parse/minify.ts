import { Entities } from "@/types/tweets.type";
import { Tweet } from "@/types/tweets.type";

// MinifyTweet Function
export const MinifyTweet = (fields: any[]): Tweet[] => {
  const validTweets: Tweet[] = fields.filter((field: Tweet) => {
    field.tweet.id === "1";
  });
  // .map((item) => {
  //   return {
  //     tweet: {
  //       id: item.id as string,
  //       created_at: item.created_at as string,
  //       entities: item.entities as Entities,
  //       full_text: item.full_text as string,
  //       in_reply_to_screen_name: item.in_reply_to_screen_name,
  //       extended_entities: item.extended_entities as any,
  //     },
  //   };
  // });

  return validTweets;
};
