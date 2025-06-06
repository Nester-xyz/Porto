import imageCompression from "browser-image-compression";
import { parse } from "node-html-parser";
import AtpAgent, { AppBskyActorProfile, BlobRef } from "@atproto/api";
import { TEmbeddedImage, Tweet } from "@/types/tweets";
import { TDateRange, TFileState } from "@/types/render";
import he from "he";
import URI from "urijs";
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
  const twitterUrlRegex = /^https:\/\/twitter\.com\//;

  const tweet = tweets.find((tweet) => tweet.tweet.id === id);
  if (!tweet) throw new Error(`Tweet with id ${id} not found`);

  const urls = tweet.tweet.entities?.urls;
  if (!urls) return false;
  if (urls.length < 0) return false;

  const isQuoted = urls.find((url) => twitterUrlRegex.test(url.expanded_url));
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

export async function bulkDeleteBskyPost(agent: AtpAgent): Promise<{
  totalPosts: number;
  deleted: number;
  failed: Array<{ uri: string; error: Error }>;
}> {
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
      console.log("Current batch of posts:", feed);
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
  agent: AtpAgent,
  fileState: TFileState
) => {
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
      throw new Error(
        "Profile data file not found in the uploaded Twitter archive"
      );
    }
    if (!accountFile) {
      throw new Error(
        "Account data file not found in the uploaded Twitter archive"
      );
    }

    // Read and parse the profile data
    const profileContent = await profileFile.text();
    console.log("Raw profile content:", profileContent.substring(0, 200)); // Debug log

    const accountContent = await accountFile.text();
    console.log("Raw profile content:", accountContent.substring(0, 200)); // Debug log
    // Handle the window._sharedData format if present
    let profileJson;
    let accountJson;

    try {
      // Remove 'window.YTD.profile.part0 = ' and parse the remaining array
      const cleanContent = profileContent
        .replace(/window\.YTD\.profile\.part0 = /, "")
        .trim();
      const profileArray = JSON.parse(cleanContent);
      profileJson = profileArray[0].profile; // Access the first profile object
    } catch (e) {
      console.error("Failed to parse profile data:", e);
      throw new Error("Failed to parse profile data from file");
    }

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

    // Extract relevant profile data with fallbacks
    const profileData: ProfileData = {
      profile_image_url: profileJson.avatarMediaUrl,
      profile_banner_url: profileJson.headerMediaUrl,
      description: profileJson.description.bio,
      name: profileJson.displayName || "", // if displayName is not available, use empty string
      location: profileJson.description.location,
      url: profileJson.description.website,
    };
    // Upload profile image
    let avatarRef: BlobResponse | undefined;
    if (profileData.profile_image_url) {
      try {
        const imageResponse = await fetch(profileData.profile_image_url);
        const imageBlob = await imageResponse.blob();
        const uploadResponse = await agent.uploadBlob(imageBlob, {
          encoding: "image/jpeg",
        });
        avatarRef = uploadResponse.data.blob;
      } catch (error) {
        console.warn("Failed to upload avatar image:", error);
      }
    }

    // Upload banner image
    let bannerRef: BlobRef;
    if (profileData.profile_banner_url) {
      try {
        const bannerResponse = await fetch(profileData.profile_banner_url);
        const bannerBlob = await bannerResponse.blob();
        const bannerUploadResponse = await agent.uploadBlob(bannerBlob, {
          encoding: "image/jpeg",
        });
        bannerRef = bannerUploadResponse.data.blob;
      } catch (error) {
        console.warn("Failed to upload banner image:", error);
      }
    }

    // Update profile using the correct upsertProfile method
    await agent.upsertProfile(async (existing) => {
      const updatedProfile: AppBskyActorProfile.Record = {
        $type: "app.bsky.actor.profile", // Add this line
        displayName: accountJson.accountDisplayName,
        description: profileData.description,
        ...(avatarRef && { avatar: avatarRef }),
        ...(bannerRef && { banner: bannerRef }),

        // Correct labels structure
        labels: {
          $type: "com.atproto.label.defs#selfLabels",
          values: [],
        },

        // Preserve existing fields
        ...(existing?.createdAt && { createdAt: existing.createdAt }),
        ...(existing?.pinnedPost && { pinnedPost: existing.pinnedPost }),
        ...(existing?.joinedViaStarterPack && {
          joinedViaStarterPack: existing.joinedViaStarterPack,
        }),
      };

      // Preserve existing fields
      if (existing?.createdAt) {
        updatedProfile.createdAt = existing.createdAt;
      }
      if (existing?.pinnedPost) {
        updatedProfile.pinnedPost = existing.pinnedPost;
      }
      if (existing?.joinedViaStarterPack) {
        updatedProfile.joinedViaStarterPack = existing.joinedViaStarterPack;
      }

      return updatedProfile;
    });

    return {
      success: true,
      message: "Profile successfully updated on Bluesky",
      updatedFields: {
        avatar: !!avatarRef,
        banner: !!bannerRef,
        description: true,
        name: true,
        location: !!profileData.location,
        url: !!profileData.url,
      },
    };
  } catch (error) {
    console.error("Error importing profile to Bluesky:", error);
    throw new Error(
      `Failed to import profile: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

export function getMergeEmbed(
  images: [] = [],
  embeddedVideo: {} | null = null,
  record: {} | null = null
): {} | null {
  let mediaData: {} | null = null;
  if (images.length > 0) {
    mediaData = {
      $type: "app.bsky.embed.images",
      images,
    };
  } else if (embeddedVideo != null) {
    mediaData = {
      $type: "app.bsky.embed.video",
      video: embeddedVideo,
    };
  }

  let recordData: {} | null = null;
  if (record && Object.keys(record).length > 0) {
    recordData = {
      $type: "app.bsky.embed.record",
      record,
    };
  }

  if (mediaData && recordData) {
    return {
      $type: "app.bsky.embed.recordWithMedia",
      media: mediaData,
      record: {
        record,
      },
    };
  }

  return mediaData || recordData;
}

export async function recompressImageIfNeeded(
  imageData: File | Blob | ArrayBuffer | string
): Promise<File> {
  // Convert string/ArrayBuffer to File if needed
  let file: File;
  if (typeof imageData === "string") {
    // Assuming it's a base64 string
    const response = await fetch(imageData);
    const blob = await response.blob();
    file = new File([blob], "image.jpg", { type: blob.type });
  } else if (imageData instanceof ArrayBuffer) {
    file = new File([new Uint8Array(imageData)], "image.jpg", {
      type: "image/jpeg",
    });
  } else {
    file =
      imageData instanceof File
        ? imageData
        : new File([imageData], "image.jpg");
  }

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.warn("Image compression failed:", error);
    return file;
  }
}

async function fetchOembed(url: string): Promise<any> {
  // Expanded list of OEmbed providers with more flexible discovery
  const oembedProviders = [
    `https://open.iframe.ly/api/oembed?url=${encodeURIComponent(url)}`,
  ];

  // Try HTML link tag discovery first
  try {
    const htmlDiscoveryEndpoint = await discoverOEmbedEndpointFromHTML(url);
    if (htmlDiscoveryEndpoint) {
      const discoveredResult = await fetchOEmbedFromDiscoveredEndpoint(
        htmlDiscoveryEndpoint,
        url
      );
      if (discoveredResult) return discoveredResult;
    }
  } catch (error) {
    console.debug("HTML OEmbed discovery failed:", error);
  }

  // Fallback to predefined providers
  for (const providerUrl of oembedProviders) {
    try {
      const response = await fetch(providerUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(25000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && (data.title || data.description || data.thumbnail_url)) {
          return data;
        }
      }
    } catch (error) {
      console.debug(`Oembed fetch error for ${providerUrl}:`, error);
    }
  }

  return null;
}

// Discover OEmbed endpoint from HTML link tags
async function discoverOEmbedEndpointFromHTML(
  url: string
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const root = parse(html);

    // Look for link tags with rel="alternate" and type="application/json+oembed"
    const oembedLinks = root.querySelectorAll(
      'link[rel="alternate"][type="application/json+oembed"]'
    );

    if (oembedLinks.length > 0) {
      const href = oembedLinks[0].getAttribute("href");
      return href || null;
    }

    return null;
  } catch (error) {
    console.debug("HTML OEmbed discovery error:", error);
    return null;
  }
}

// Fetch OEmbed data from discovered endpoint
async function fetchOEmbedFromDiscoveredEndpoint(
  endpoint: string,
  originalUrl: string
): Promise<any | null> {
  try {
    const fullEndpoint = `${endpoint}?url=${encodeURIComponent(originalUrl)}&format=json`;

    const response = await fetch(fullEndpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(25000),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.debug("Discovered endpoint OEmbed fetch error:", error);
  }

  return null;
}

export async function fetchEmbedUrlCard(
  url: string,
  agent: AtpAgent
): Promise<any> {
  const card: EmbedCard = {
    uri: url,
    title: "",
    description: "",
    thumb: { $type: "none", ref: "", mimeType: "", size: 0 },
  };

  try {
    console.log("fetching the embed url card");
    const oembedResult = await fetchOembed(url);

    if (oembedResult) {
      card.title = oembedResult.title || card.title;
      card.description = oembedResult.description || card.description;

      if (oembedResult.thumbnail_url) {
        try {
          const imgResp = await fetch(oembedResult.thumbnail_url, {
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "image/*",
            },
            mode: "cors",
            credentials: "omit",
            signal: AbortSignal.timeout(25000),
          });

          if (imgResp.ok) {
            let imgBuffer = await imgResp.arrayBuffer();
            const mimeType =
              imgResp.headers.get("content-type") || "image/jpeg";

            if (imgBuffer.byteLength > MAX_FILE_SIZE) {
              console.warn("Image needs compression");
            }

            if (
              mimeType.startsWith("image/") &&
              !mimeType.startsWith("image/svg")
            ) {
              const blobRecord = await agent.uploadBlob(imgBuffer, {
                encoding: mimeType,
              });

              card.thumb = {
                $type: "blob",
                ref: blobRecord.data.blob.ref,
                mimeType: blobRecord.data.blob.mimeType,
                size: blobRecord.data.blob.size,
              };
            }
          }
        } catch (error) {
          console.warn("Thumbnail fetch error:", error);
        }
      }
    }

    // Fallback to direct URL fetch if no OEmbed data
    if (!card.title && !card.description && !card.thumb.size) {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(25000),
      });

      if (!resp.ok) {
        if (resp.status === 401 && url.startsWith("http:")) {
          return await fetchEmbedUrlCard(url.replace("http:", "https:"), agent);
        }
        throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
      }

      const html = await resp.text();
      const root = parse(html);

      const titleTag = root.querySelector('meta[property="og:title"]');
      if (titleTag) {
        card.title = he.decode(titleTag.getAttribute("content") || "");
      }

      const descriptionTag = root.querySelector(
        'meta[property="og:description"]'
      );
      if (descriptionTag) {
        card.description = he.decode(
          descriptionTag.getAttribute("content") || ""
        );
      }

      const imageTag = root.querySelector('meta[property="og:image"]');
      if (imageTag) {
        let imgUrl = imageTag.getAttribute("content") || "";
        if (!imgUrl.includes("://")) {
          imgUrl = new URL(imgUrl, url).href;
        }

        try {
          const imgResp = await fetch(imgUrl, {
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "image/*",
            },
            signal: AbortSignal.timeout(25000),
          });

          if (imgResp.ok) {
            let imgBuffer = await imgResp.arrayBuffer();
            const mimeType =
              imgResp.headers.get("content-type") || "image/jpeg";

            if (imgBuffer.byteLength > MAX_FILE_SIZE) {
              console.warn("Image needs compression");
            }

            if (
              mimeType.startsWith("image/") &&
              !mimeType.startsWith("image/svg")
            ) {
              const blobRecord = await agent.uploadBlob(imgBuffer, {
                encoding: mimeType,
              });

              card.thumb = {
                $type: "blob",
                ref: blobRecord.data.blob.ref,
                mimeType: blobRecord.data.blob.mimeType,
                size: blobRecord.data.blob.size,
              };
            }
          }
        } catch (error) {
          console.warn("Image fetch error:", error);
        }
      }
    }

    // Standardize return format for Bluesky
    if (card.title || card.description || card.thumb.size > 0) {
      return {
        $type: "app.bsky.embed.external",
        external: {
          uri: url,
          title: card.title || "",
          description: card.description || "",
          ...(card.thumb.size > 0 ? { thumb: card.thumb } : {}),
        },
      };
    }

    return null;
  } catch (error: any) {
    console.warn(`Error fetching embed URL card: ${error.message}`);
    return null;
  }
}

export function checkPastHandles(
  twitterHandles: string[],
  url: string
): boolean {
  return (twitterHandles || []).some(
    (handle) =>
      url.startsWith(`https://x.com/${handle}/`) ||
      url.startsWith(`https://twitter.com/${handle}/`)
  );
}

export function getEmbeddedUrlAndRecord(
  twitterHandles: string[],
  urls: Array<{ expanded_url: string }>,
  tweets: Array<{
    tweet: Record<string, string>;
    bsky?: Record<string, string>;
  }>
): {
  embeddedUrl: string | null;
  embeddedRecord: {
    uri: string;
    cid: string;
  } | null;
} {
  let embeddedTweetUrl: string | null = null;
  const nullResult = {
    embeddedUrl: null,
    embeddedRecord: null,
  };

  // get the last one url to embed
  const reversedUrls = urls.reverse();
  embeddedTweetUrl =
    reversedUrls.find(({ expanded_url }) =>
      checkPastHandles(twitterHandles, expanded_url)
    )?.expanded_url ?? null;

  if (!embeddedTweetUrl) {
    return nullResult;
  }

  const index = embeddedTweetUrl.lastIndexOf("/");
  if (index == -1) {
    return nullResult;
  }

  const urlId = embeddedTweetUrl.substring(index + 1);
  const tweet = tweets.find(({ tweet: { id } }) => id == urlId);

  if (!tweet?.bsky) {
    return nullResult;
  }

  return {
    embeddedUrl: embeddedTweetUrl,
    embeddedRecord: {
      uri: tweet.bsky.uri,
      cid: tweet.bsky.cid,
    },
  };
}
