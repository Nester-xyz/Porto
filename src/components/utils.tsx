import AtpAgent, { AppBskyActorProfile, BlobRef } from "@atproto/api";
import { TEmbeddedImage, Tweet } from "@/types/tweets";
import { TDateRange, TFileState } from "@/types/render";
import he from "he";
import URI from "urijs";

type BlobResponse = BlobRef;
export const findFileFromMap = (
  fileMap: Map<string, File>,
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

  const urls = tweet.tweet.entities?.urls;
  if (!urls) return false;
  if (urls.length < 0) return false;

  const isQuoted = urls.find((url) => twitterUrlRegex.test(url.expanded_url));
  return isQuoted ? true : false;
};

export const sortTweetsWithDateRange = (
  tweets: Tweet[],
  dateRange: TDateRange,
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
          }),
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
  fileState: TFileState,
) => {
  if (!agent) {
    throw new Error("Bluesky agent not initialized");
  }

  try {
    const fileMap = new Map(
      Array.from(fileState.files || []).map((file) => [
        file.webkitRelativePath,
        file,
      ]),
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
        "Profile data file not found in the uploaded Twitter archive",
      );
    }
    if (!accountFile) {
      throw new Error(
        "Account data file not found in the uploaded Twitter archive",
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
      `Failed to import profile: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export function getMergeEmbed(images: TEmbeddedImage[] = []) {
  let mediaData = null;
  if (images.length > 0) {
    mediaData = {
      $type: "app.bsky.embed.images",
      images,
    };
  }

  return mediaData;
}
