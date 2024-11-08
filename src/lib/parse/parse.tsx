import { TDateRange } from "@/types/render";
import { Tweet } from "@/types/tweets.type";
import he from "he";
import URI from "urijs";

export const findFileFromMap = (
  fileMap: Map<String, File>,
  fileName: string,
): File | null => {
  if (!fileMap || fileMap.size === 0) return null;
  const filePath = Array.from(fileMap.keys()).find((filePath) => {
    const pathParts = filePath.split("/");
    const actualFileName = pathParts[pathParts.length - 1];
    return actualFileName === fileName;
  });
  return filePath ? fileMap.get(filePath) || null : null;
};

export const parseTweetsFile = (content: string): Tweet[] => {
  // console.log(content, "this is content");
  try {
    return JSON.parse(content);
  } catch {
    try {
      const jsonContent = content
        .replace(/^window\.YTD\.tweets\.part0\s*=\s*/, "")
        .replace(/;$/, "");
      return JSON.parse(jsonContent);
    } catch (error) {
      throw new Error(`Failed to parse tweets file: ${error}`);
    }
  }
};

export const isQuote = (tweets: Tweet[], id: string) => {
  const twitterUrlRegex = /^https:\/\/twitter\.com\//;

  const tweet = tweets.find((tweet) => tweet.tweet.id === id);
  if (!tweet) throw new Error(`Tweet with id ${id} not found`);

  const urls = tweet.tweet.entities.urls;
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
    console.log("skipped", tweet.full_text);
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

export async function cleanTweetText(tweetFullText: string): Promise<string> {
  let newText = tweetFullText;
  const urls: string[] = [];
  URI.withinString(tweetFullText, (url) => {
    urls.push(url);
    return url;
  });

  async function resolveShortURL(url: string) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
      });
      return response.url;
    } catch (error) {
      console.warn(`Error parsing url ${url}:`, error);
      return url;
    }
  }

  if (urls.length > 0) {
    const newUrls = await Promise.all(urls.map(resolveShortURL));
    let j = 0;
    newText = URI.withinString(tweetFullText, (url) => {
      if (newUrls[j].indexOf("/photo/") > 0) {
        j++;
        return "";
      }
      return newUrls[j++];
    });
  }

  function removeTcoLinks(text: string) {
    const pattern = /(https?:\/\/)?t\.co\/\S+/g;
    const cleanedText = text.replace(pattern, "").trim();
    return cleanedText;
  }

  newText = he.decode(newText);
  return removeTcoLinks(newText);
}
