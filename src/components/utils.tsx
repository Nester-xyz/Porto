import imageCompression from "browser-image-compression";
import { parse } from "node-html-parser";
import { AppBskyActorProfile, BlobRef } from "@atproto/api";
import { TEmbeddedImage, Tweet } from "@/types/tweets";
import { TDateRange, TFileState } from "@/types/render";
import he from "he";
import URI from "urijs";
import { RateLimitedAgent } from "@/lib/rateLimit/RateLimitedAgent";
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";

interface Thumb {
  $type: "none" | "blob";
  ref: string;
  mimeType: string;
  size: number;
}

interface EmbedCard {
  uri: string;
  title: string;
  description: string;
  thumb: Thumb;
}

interface ProfileData {
  profile: {
    description: {
      bio: string;
      website: string;
      location: string;
    };
    header: {
      url: string;
    };
    avatar: {
      url: string;
    };
  };
}

type BlobResponse = BlobRef;
export const findFileFromMap = (
  fileMap: Map<string, File>,
  fileName: string
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
  const twitterUrlRegex = /^https:\/\/(twitter|x)\.com\//;

  const tweet = tweets.find((tweet) => tweet.tweet.id === id);
  if (!tweet) throw new Error(`Tweet with id ${id} not found`);

  const urls = tweet.tweet.entities?.urls;
  if (!urls) return false;
  if (urls.length < 0) return false;

  const isQuoted = urls.find((url) =>
    twitterUrlRegex.test(String(url.expanded_url ?? ""))
  );
  return isQuoted ? true : false;
};

export const sortTweetsWithDateRange = (
  tweets: Tweet[],
  dateRange: TDateRange
) =>
  tweets
    .filter((tweet) => {
      const tweetDate = new Date(tweet.tweet.created_at);
      if (isQuote(tweets, tweet.tweet.id)) return false;
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
    newText = URI.withinString(tweetFullText, () => {
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

export async function bulkDeleteBskyPost(
  rateLimitedAgent: RateLimitedAgent
): Promise<{
  totalPosts: number;
  deleted: number;
  failed: Array<{ uri: string; error: Error }>;
}> {
  const agent = rateLimitedAgent.agent;
  const results = {
    totalPosts: 0,
    deleted: 0,
    failed: [] as Array<{ uri: string; error: Error }>,
  };

  try {
    let cursor: string | undefined = undefined; // Initialize as undefined instead of empty string
    const limit: number = 50;

    let run = true;
    do {
      // Get batch of posts
      const { data } = await agent.getAuthorFeed({
        actor: agent.did!,
        limit,
        ...(cursor ? { cursor } : {}), // Only include cursor if it exists
      });

      if (!data?.feed) {
        run = false;
        break; // Exit if no feed is returned
      }

      const { feed } = data;
      results.totalPosts += feed.length;

      // Process current batch in smaller chunks
      const batchSize = 10;
      for (let i = 0; i < feed.length; i += batchSize) {
        const batch = feed.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async ({ post }) => {
            try {
              await agent.deletePost(post.uri);
              results.deleted++;
            } catch (error) {
              results.failed.push({
                uri: post.uri,
                error:
                  error instanceof Error ? error : new Error(String(error)),
              });
            }
          })
        );
      }

      // Update cursor for next iteration
      cursor = data.cursor;

      // If no cursor returned, break the loop
      if (!cursor) {
        run = false;
        break;
      }
    } while (run);

    return results;
  } catch (error) {
    console.error("Error in bulkDeleteBskyPost:", error);
    throw error;
  }
}

export const importXProfileToBsky = async (
  rateLimitedAgent: RateLimitedAgent,
  fileState: TFileState
) => {
  const agent = rateLimitedAgent.agent;
  if (!agent) {
    throw new Error("Bluesky agent not initialized");
  }

  try {
    const fileMap = new Map(
      Array.from(fileState.files || []).map((file) => [
        file.webkitRelativePath,
        file,
      ])
    );

    // Find the profile.js file in the correct path structure
    const findProfileFile = (fileName: string) => {
      for (const [path, file] of fileMap.entries()) {
        if (path.includes(fileName)) {
          return file;
        }
      }
      return null;
    };

    const profileFile = findProfileFile("data/profile.js");
    const accountFile = findProfileFile("data/account.js");

    if (!profileFile) {
      // return;
    }
    if (!accountFile) {
    }
    // If account.js found do this
    const accountContent = await accountFile!.text();
    let accountJson;
    try {
      // Remove 'window.YTD.account.part0 = ' and parse the remaining array
      const cleanContent = accountContent
        .replace(/window\.YTD\.account\.part0 = /, "")
        .trim();
      const accountArray = JSON.parse(cleanContent);
      accountJson = accountArray[0].account; // Access the first account object
    } catch (e) {
      console.error("Failed to parse profile data:", e);
      throw new Error("Failed to parse profile data from file");
    }

    // if profile.js found do this
    const profileContent = await profileFile!.text();
    let profileJson: ProfileData | null = null; // Initialize to null
    try {
      const cleanContent = profileContent
        .replace(/window\.YTD\.profile\.part0 = /, "")
        .trim();
      const profileArray = JSON.parse(cleanContent);
      profileJson = profileArray[0];
    } catch (e) {
      console.error("Failed to parse profile data:", e);
      profileJson = null; // Set to null on failure
    }

    console.log("profileJson", profileJson);

    // const { profile } = profileJson;

    const uploadImage = async (url: string): Promise<BlobResponse | null> => {
      if (!url) return null;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], {
          type:
            response.headers.get("content-type") || "application/octet-stream",
        });

        // Recompress image if needed
        const compressedFile = await recompressImageIfNeeded(blob);
        const newArrayBuffer = await compressedFile.arrayBuffer();

        const uploadResponse = await agent.uploadBlob(
          new Uint8Array(newArrayBuffer),
          {
            encoding: compressedFile.type,
          }
        );
        return uploadResponse.data.blob;
      } catch (error) {
        console.error("Error uploading image:", error);
        return null;
      }
    };

    const headerBlob = await uploadImage(profileJson!.profile.header.url);
    const avatarBlob = await uploadImage(profileJson!.profile.avatar.url);

    const updatedProfile: AppBskyActorProfile.Record = {
      $type: "app.bsky.actor.profile",
      displayName: accountJson.username,
      description: profileJson!.profile.description.bio,
      banner: headerBlob!,
      avatar: avatarBlob!,
    };

    // Update profile
    await agent.upsertProfile((existing) => {
      const merged = { ...existing, ...updatedProfile };
      return merged;
    });
  } catch (error) {
    console.error("Error importing profile:", error);
  }
};

export function getMergeEmbed(
  images: TEmbeddedImage[] = [],
  embeddedVideo: {} | null = null,
  record: {} | null = null
): {} | null {
  let mediaEmbed: any = null;

  if (images.length > 0) {
    mediaEmbed = {
      $type: "app.bsky.embed.images",
      images: images,
    };
  } else if (embeddedVideo && Object.keys(embeddedVideo).length > 0) {
    mediaEmbed = {
      $type: "app.bsky.embed.video",
      video: embeddedVideo,
    };
  }

  if (record && Object.keys(record).length > 0) {
    if (mediaEmbed) {
      return {
        $type: "app.bsky.embed.recordWithMedia",
        record: record,
        media: mediaEmbed,
      };
    } else {
      return {
        $type: "app.bsky.embed.record",
        record: record,
      };
    }
  }

  return mediaEmbed;
}

export async function recompressImageIfNeeded(
  imageData: File | Blob | ArrayBuffer | string
): Promise<File> {
  const options = {
    maxSizeMB: 0.95, // Corresponds to just under 1MB
    maxWidthOrHeight: 2000,
    useWebWorker: true,
  };

  let file: File;

  // Convert ArrayBuffer or string to Blob if necessary
  if (imageData instanceof ArrayBuffer) {
    file = new File([imageData], "image.jpg", { type: "image/jpeg" }); // Simplified, might need specific type
  } else if (typeof imageData === "string") {
    // Assuming base64 or data URL, fetch and convert to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    file = new File([blob], "image.jpg", { type: blob.type });
  } else {
    file = imageData as File;
  }
  if (file.size <= MAX_FILE_SIZE) {
    return file; // No compression needed
  }

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error("Image compression error:", error);
    return file; // Return original file on error
  }
}
async function fetchOembed(url: string): Promise<any> {
  // 1. Discover oEmbed endpoint from the URL's HTML
  const endpointUrl = await discoverOEmbedEndpointFromHTML(url);
  if (endpointUrl) {
    // 2. Fetch data from the discovered oEmbed endpoint
    const oembedData = await fetchOEmbedFromDiscoveredEndpoint(
      endpointUrl,
      url
    );
    if (oembedData) {
      return oembedData;
    }
  }
  return null;
}

async function discoverOEmbedEndpointFromHTML(
  url: string
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) {
      console.warn(
        `Failed to fetch HTML for oEmbed discovery: ${response.status}`
      );
      return null;
    }
    const html = await response.text();
    const root = parse(html);

    // Look for <link type="application/json+oembed" href="...">
    const linkTag = root.querySelector('link[type="application/json+oembed"]');
    if (linkTag) {
      const href = linkTag.getAttribute("href");
      if (href) {
        // Construct absolute URL if the href is relative
        return new URL(href, url).href;
      }
    }
  } catch (error) {
    console.warn(`Error discovering oEmbed endpoint: ${error}`);
  }
  return null;
}
async function fetchOEmbedFromDiscoveredEndpoint(
  endpoint: string,
  originalUrl: string
): Promise<any | null> {
  try {
    // Append format and url parameters to the endpoint URL
    const requestUrl = new URL(endpoint);
    requestUrl.searchParams.append("format", "json");
    requestUrl.searchParams.append("url", originalUrl);

    const response = await fetch(requestUrl.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn(`Error fetching from oEmbed endpoint: ${error}`);
  }
  return null;
}

export const fetchEmbedUrlCard = async (
  url: string,
  agent: any
): Promise<any> => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const noembedAllowedHosts = [
      "youtu.be",
      "youtube.com",
      "youtube-nocookie.com",
      "vimeo.com",
      "soundcloud.com",
      "spotify.com",
      "open.spotify.com",
    ];
    const shouldTryNoembed = noembedAllowedHosts.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );

    const uploadThumb = async (
      imageUrl: string,
      opts: { useProxy?: boolean } = {}
    ): Promise<BlobRef | undefined> => {
      try {
        const candidates = [imageUrl];
        if (opts.useProxy) {
          candidates.push(
            `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`
          );
        }

        let imageResponse: Response | null = null;
        for (const candidate of candidates) {
          try {
            const res = await fetch(candidate);
            if (res.ok) {
              imageResponse = res;
              break;
            }
          } catch {
            // Try next candidate.
          }
        }

        if (!imageResponse) return undefined;

        const imageBlob = await imageResponse.blob();
        const file = new File([imageBlob], "thumb", {
          type: imageBlob.type || "image/jpeg",
        });
        const compressed = await recompressImageIfNeeded(file);
        const buffer = await compressed.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        const uploadedThumb = await agent.uploadBlob(uint8Array, {
          encoding: compressed.type,
        });
        return uploadedThumb?.data?.blob;
      } catch (error) {
        console.warn(`Failed to fetch or upload thumbnail: ${error}`);
        return undefined;
      }
    };

    // Some media providers are frequently blocked by HTML fetch proxies; use oEmbed via noembed.
    if (shouldTryNoembed) {
      const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(
        url
      )}`;
      const noembedRes = await fetch(noembedUrl);
      if (!noembedRes.ok) return null;
      const data = await noembedRes.json();
      if (data?.error) return null;

      const title = String(data?.title || "").trim() || parsedUrl.hostname;
      const providerName = String(data?.provider_name || "YouTube").trim();
      const authorName = String(data?.author_name || "").trim();
      const description = authorName
        ? `${providerName} · ${authorName}`
        : providerName;
      const imageUrl = typeof data?.thumbnail_url === "string" ? data.thumbnail_url : null;

      const externalEmbed: any = {
        $type: "app.bsky.embed.external",
        external: {
          uri: url,
          title,
          description,
        },
      };

      if (imageUrl) {
        const thumb = await uploadThumb(imageUrl, { useProxy: true });
        if (thumb) externalEmbed.external.thumb = thumb;
      }

      return externalEmbed;
    }

    // Generic OpenGraph fall-back (proxy HTML to avoid CORS on arbitrary sites).
    const fetchHtml = async (target: string): Promise<string | null> => {
      // Try direct fetch first (often works in extension context), then proxy.
      try {
        const direct = await fetch(target, {
          headers: { Accept: "text/html,*/*" },
        });
        if (direct.ok) return await direct.text();
      } catch {
        // Ignore and fall back to proxy.
      }

      try {
        const proxied = await fetch(
          `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`
        );
        if (proxied.ok) return await proxied.text();
      } catch {
        // Ignore.
      }
      return null;
    };

    const html = await fetchHtml(url);
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, "text/html");

    const titleRaw =
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      doc.querySelector("title")?.textContent ||
      "";
    const descriptionRaw =
      doc
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content") ||
      doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
      "";
    const imageUrl =
      doc
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") || null;

    const title = String(titleRaw || "").trim() || parsedUrl.hostname;
    const description = String(descriptionRaw || "").trim() || parsedUrl.hostname;

    const externalEmbed: any = {
      $type: "app.bsky.embed.external",
      external: {
        uri: url,
        title,
        description,
      },
    };

    if (imageUrl) {
      const thumb = await uploadThumb(imageUrl, { useProxy: true });
      if (thumb) externalEmbed.external.thumb = thumb;
    }

    return externalEmbed;
  } catch (error: any) {
    console.warn(`Error fetching embed URL card: ${error.message}`);
    return null;
  }
};

export function checkPastHandles(
  twitterHandles: string[],
  url: string
): boolean {
  if (!url) return false;

  for (const handle of twitterHandles) {
    const pastHandlePattern = new RegExp(
      `^https://(?:twitter|x)\\.com/${handle}/status/(\\d+)$`
    );
    if (pastHandlePattern.test(url)) return true;
  }
  return false;
}

export const getEmbeddedUrlAndRecord = (
  twitterHandles: string[],
  urls: any[],
  tweets: Array<{ tweet: Record<string, string>; bsky?: any }>
) => {
  if (!urls || urls.length === 0)
    return { embeddedUrl: null, embeddedRecord: null };

  const firstUrl = urls[0].expanded_url;

  if (checkPastHandles(twitterHandles, firstUrl)) {
    const statusId = firstUrl.split("/").pop();
    const existingTweet = tweets.find(
      ({ tweet, bsky }) => tweet.id_str === statusId && bsky
    );

    if (existingTweet) {
      const { uri, cid } = existingTweet.bsky;
      return {
        embeddedUrl: null,
        embeddedRecord: {
          $type: "app.bsky.embed.record",
          record: {
            uri,
            cid,
          },
        },
      };
    }
  }

  return { embeddedUrl: { uri: firstUrl }, embeddedRecord: null };
};
