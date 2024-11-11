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
  try {
    // First try parsing as regular JSON
    return JSON.parse(content);
  } catch {
    try {
      // If that fails, try cleaning up Twitter's export format
      const jsonContent = content
        .replace(/^window\.YTD\.tweets\.part0\s*=\s*/, "")
        .replace(/;$/, "");
      const parsed = JSON.parse(jsonContent);
      // Handle both possible data structures
      return Array.isArray(parsed) ? parsed : parsed.tweets;
    } catch (error) {
      throw new Error(`Failed to parse tweets file: ${error}`);
    }
  }
};

export const isQuote = (tweets: Tweet[], id: string): boolean => {
  const twitterUrlRegex = /^https:\/\/twitter\.com\//;
  const tweet = tweets.find((tweet) => tweet.tweet.id === id);
  if (!tweet) return false; // Changed from throwing error to returning false

  const urls = tweet.tweet.entities?.urls || []; // Added optional chaining
  if (urls.length === 0) return false; // Fixed comparison from < 0

  return urls.some((url) => twitterUrlRegex.test(url.expanded_url)); // Simplified using some()
};

export const isPostValid = (tweet: Tweet["tweet"]): boolean => {
  // Check for null/undefined before accessing properties
  if (!tweet || !tweet.full_text) return false;

  return !(
    tweet.in_reply_to_screen_name ||
    tweet.full_text.startsWith("@") ||
    tweet.full_text.startsWith("RT ")
  );
};

export const sortTweetsWithDateRange = (tweets: Tweet[], dateRange: TDateRange): Tweet[] => {
  if (!Array.isArray(tweets)) return [];

  // Parse date range boundaries once, outside the filter
  const minDate = dateRange.min_date ? new Date(dateRange.min_date).getTime() : null;
  const maxDate = dateRange.max_date ? new Date(dateRange.max_date).getTime() : null;

  return tweets
    .filter((tweet) => {
      try {
        const tweetDate = new Date(tweet.tweet.created_at).getTime();
        if (!tweetDate) return false; // Invalid date check

        if (isQuote(tweets, tweet.tweet.id)) return false;
        if (!isPostValid(tweet.tweet)) return false;

        // Compare timestamps instead of Date objects
        if (minDate && tweetDate < minDate) return false;
        if (maxDate && tweetDate > maxDate) return false;

        return true;
      } catch (error) {
        console.error('Error processing tweet:', error);
        return false;
      }
    })
    .sort((a, b) => {
      // Sort using timestamps
      return (
        new Date(a.tweet.created_at).getTime() -
        new Date(b.tweet.created_at).getTime()
      );
    });
};
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
export const sendFileInChunks = async (file: File): Promise<string> => {
  const chunkSize = 15 * 1024 * 1024; // 5MB chunks
  const fileId = `file_${Date.now()}`;
  const totalChunks = Math.ceil(file.size / chunkSize);

  console.log(`Starting transfer of ${file.name}, ID: ${fileId}`);

  // Send initial file metadata
  await chrome.runtime.sendMessage({
    action: 'fileTransfer',
    fileId,
    fileName: file.name,
    fileType: file.type,
    totalSize: file.size
  });

  // Read and send file in chunks
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = uint8Array.slice(start, end);

    await chrome.runtime.sendMessage({
      type: 'chunk',
      id: fileId,
      chunkIndex: i,
      totalChunks,
      data: Array.from(chunk)
    });

    console.log(`Sent chunk ${i + 1}/${totalChunks} for ${file.name}`);
  }

  return fileId;
};
