import { TDateRange } from "@/types/render";
import { Tweet } from "@/types/tweets";

export const isQuote = (tweets: Tweet[], id: string) => {
  const twitterUrlRegex = /^https:\/\/(twitter|x)\.com\//;

  const tweet = tweets.find((tweet) => tweet.tweet.id === id);
  if (!tweet) throw new Error(`Tweet with id ${id} not found`);

  const urls = tweet.tweet.entities?.urls;
  if (!urls) return
  if (urls.length < 0) return false;

  const isQuoted = urls.find((url) =>
    twitterUrlRegex.test(String(url.expanded_url ?? ""))
  );
  return isQuoted ? true : false;
};

export const isPostValid = (tweet: Tweet["tweet"]) => {
  if (
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
      const dateComparison =
        new Date(a.tweet.created_at).getTime() -
        new Date(b.tweet.created_at).getTime();

      // If dates are the same, use tweet ID as a secondary sorting criterion
      if (dateComparison === 0) {
        return parseInt(a.tweet.id) - parseInt(b.tweet.id);
      }

      return dateComparison;
    });
