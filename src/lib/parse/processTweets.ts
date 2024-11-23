import { TDateRange } from "@/types/render";
import { Tweet } from "@/types/tweets";
import { MinifyTweet } from "@/lib/parse/minify";
import { parseTweetsFile } from "@/lib/parse/parse";
import { sortTweetsWithDateRange } from "@/lib/parse/analyze";

export const processTweetsData = async (
  tweetsFile: File,
  dateRange: TDateRange,
): Promise<{
  tweets: Tweet[];
  validTweets: Tweet[];
}> => {
  const content = await tweetsFile.text();
  const tweets: Tweet[] = MinifyTweet(parseTweetsFile(content));
  const validTweets: Tweet[] = sortTweetsWithDateRange(tweets, dateRange);

  return {
    tweets,
    validTweets,
  };
};
