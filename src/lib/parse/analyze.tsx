import { TDateRange } from "@/types/render";
import { Tweet } from "@/types/tweets";

export const isQuote = (tweets: Tweet[], id: string) => {
  const twitterUrlRegex = /^https:\/\/twitter\.com\//;

  const tweet = tweets.find((tweet) => tweet.tweet.id === id);
  if (!tweet) throw new Error(`Tweet with id ${id} not found`);

  const urls = tweet.tweet.entities?.urls;
  if (!urls) return
  if (urls.length < 0) return false;

  const isQuoted = urls.find((url) => twitterUrlRegex.test(url.expanded_url));
  return isQuoted ? true : false;
};

export const isPostValid = (tweet: Tweet["tweet"]) => {
  if (
    tweet.in_reply_to_screen_name ||
    tweet.full_text.startsWith("@") ||
    tweet.full_text.startsWith("RT ")
  ) {
    return false;
  }
  return true;
};

export const sortTweetsWithDateRange = (
  tweets: Tweet[],
  dateRange: TDateRange,
) =>
  tweets
    .filter((tweet) => {
      const tweetDate = new Date(tweet.tweet.created_at);
      if (isQuote(tweets, tweet.tweet.id)) return false;
      if (!isPostValid(tweet.tweet)) return false;
      if (dateRange.min_date && tweetDate < dateRange.min_date) return false;
      if (dateRange.max_date && tweetDate > dateRange.max_date) return false;
      return true;
    })
    .sort((a, b) => {
      return (
        new Date(a.tweet.created_at).getTime() -
        new Date(b.tweet.created_at).getTime()
      );
    });
