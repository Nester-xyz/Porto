import { useMemo, useState, useCallback } from "react";
import { useLogInContext } from "./LogInContext";
import { shareableData } from "@/types/render";
import {
  cleanTweetText,
  isPostValid,
  isQuote,
} from "@/lib/parse/parse";
import { TMedia, TEmbeddedImage, Tweet, VideoVariant } from "@/types/tweets";
import { processTweetsData } from "@/lib/parse/processTweets";
import {
  getMergeEmbed,
  fetchEmbedUrlCard,
  getEmbeddedUrlAndRecord,
} from "@/components/utils";
import { ApiDelay } from "@/lib/constant";
import { AtpAgent, AppBskyVideoDefs, BlobRef, RichText } from "@atproto/api";
import { findFileFromMap } from "@/lib/parse/parse";

export const filePassableType = (fileType: string = ""): string => {
  if (fileType === "png") return "image/png";
  if (fileType === "jpg") return "image/jpeg";
  return "";
};

const MAX_POST_GRAPHEMES = 300;

const countGraphemes = (text: string): number => {
  if (!("Segmenter" in Intl)) return Array.from(text).length;
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return Array.from(segmenter.segment(text)).length;
};

const splitHardByGraphemes = (text: string, maxGraphemes: number): string[] => {
  if (text.length === 0) return [""];
  if (!("Segmenter" in Intl)) {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxGraphemes) {
      chunks.push(text.slice(i, i + maxGraphemes));
    }
    return chunks.length ? chunks : [text];
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const chunks: string[] = [];
  let current = "";
  let count = 0;

  for (const part of segmenter.segment(text)) {
    const seg = part.segment;
    if (count + 1 > maxGraphemes) {
      chunks.push(current);
      current = seg;
      count = 1;
      continue;
    }
    current += seg;
    count++;
  }

  if (current.length > 0) chunks.push(current);
  return chunks.length ? chunks : [text];
};

// Prefer splitting at word boundaries so continuation threads are readable.
const splitByWords = (text: string, maxGraphemes: number): string[] => {
  const normalized = text.trim();
  if (normalized.length === 0) return [""];
  if (countGraphemes(normalized) <= maxGraphemes) return [normalized];

  const tokens = normalized.match(/\S+\s*/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";
  let currentCount = 0;

  for (const rawToken of tokens) {
    const token = current.length === 0 ? rawToken.trimStart() : rawToken;
    const tokenCount = countGraphemes(token);

    if (tokenCount > maxGraphemes) {
      if (current.trim().length > 0) {
        chunks.push(current.trimEnd());
        current = "";
        currentCount = 0;
      }
      const hardChunks = splitHardByGraphemes(token.trim(), maxGraphemes);
      chunks.push(...hardChunks.map((c) => c.trimEnd()).filter(Boolean));
      continue;
    }

    if (currentCount + tokenCount <= maxGraphemes) {
      current += token;
      currentCount += tokenCount;
      continue;
    }

    if (current.trim().length > 0) chunks.push(current.trimEnd());
    current = token.trimStart();
    currentCount = countGraphemes(current);
  }

  if (current.trim().length > 0) chunks.push(current.trimEnd());

  return chunks.length ? chunks : [normalized];
};

const cannotPost = (
  singleTweet: Tweet["tweet"],
  tweetsArray: Tweet[]
): boolean => !isPostValid(singleTweet) || isQuote(tweetsArray, singleTweet.id);

export const useUpload = ({
  shareableData,
}: {
  shareableData: shareableData;
}) => {
  const { agent } = useLogInContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skippedVideos, setSkippedVideos] = useState<Tweet["tweet"][]>([]);
  const simulate = useMemo(() => true, []);

  const { fileMap, dateRange, mediaLocation, tweetsLocation } = shareableData;

  const processMedia = async (
    media: TMedia,
    tweetId: string
  ): Promise<TEmbeddedImage | null> => {
    if (media.type !== "photo") {
      return null;
    }

    const fileType = media.media_url.split(".").pop();
    const mimeType = filePassableType(fileType);
    if (!mimeType) return null;

    const mediaFilename = `${mediaLocation}/${tweetId}-${media.media_url.split("/").pop()}`;
    const imageFile = fileMap.get(mediaFilename);

    if (!imageFile) return null;

    const imageBuffer = await imageFile.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);

    const blobRecord = await agent?.uploadBlob(uint8Array, {
      encoding: mimeType,
    });
	    return {
	      alt: "",
	      image: {
	        $type: "blob",
	        ref: blobRecord?.data.blob.ref,
	        mimeType: blobRecord?.data.blob.mimeType,
	        size: blobRecord?.data.blob.size,
	      },
	    };
	  };

  const postSingleRecord = async ({
    text,
    createdAt,
    embeddedImage,
    embeddedVideo,
    embeddedRecord,
    externalEmbed,
    replyTo,
  }: {
    text: string;
    createdAt: string;
    embeddedImage: TEmbeddedImage[];
    embeddedVideo: any;
    embeddedRecord: any;
    externalEmbed: any;
    replyTo: any;
  }): Promise<{ uri: string; cid: string } | null> => {
    if (!agent) return null;

    const rt = new RichText({ text });
    await rt.detectFacets(agent!.agent);

    const postRecord: any = {
      $type: "app.bsky.feed.post",
      text: rt.text,
      facets: rt.facets,
      createdAt,
    };

    const embed = getMergeEmbed(embeddedImage, embeddedVideo, embeddedRecord);
    if (embed && Object.keys(embed).length > 0) {
      postRecord.embed = embed;
    } else if (externalEmbed) {
      postRecord.embed = externalEmbed;
    }

    if (replyTo && Object.keys(replyTo).length > 0) {
      postRecord.reply = replyTo;
    }

    await new Promise((resolve) => setTimeout(resolve, ApiDelay));
    try {
      const recordData = await agent.post(postRecord);
      return { uri: recordData.uri, cid: recordData.cid };
    } catch {
      return null;
    }
  };

  const createPostRecord = async (
    tweet: Tweet["tweet"],
    embeddedImage: TEmbeddedImage[],
    embeddedVideo: any,
    embeddedRecord: any,
    externalEmbed: any,
    replyTo: any,
    validTweets: any,
    index: number
  ) => {
    if (!agent) return;

    const postText = await cleanTweetText(tweet.full_text, tweet.entities);
    const chunks = splitByWords(postText, MAX_POST_GRAPHEMES);
    const createdAtBaseMs = new Date(tweet.created_at).getTime();

    const rootRef = await postSingleRecord({
      text: chunks[0] ?? "",
      createdAt: new Date(createdAtBaseMs).toISOString(),
      embeddedImage,
      embeddedVideo,
      embeddedRecord,
      externalEmbed,
      replyTo,
    });

    if (!rootRef) return;

    validTweets[index].bsky = {
      uri: rootRef.uri,
      cid: rootRef.cid,
    };

    if (chunks.length <= 1) return;

    let parentRef = rootRef;
    for (let i = 1; i < chunks.length; i++) {
      const continuation = await postSingleRecord({
        text: chunks[i] ?? "",
        createdAt: new Date(createdAtBaseMs + i * 1000).toISOString(),
        embeddedImage: [],
        embeddedVideo: null,
        embeddedRecord: null,
        externalEmbed: null,
        replyTo: {
          root: { uri: rootRef.uri, cid: rootRef.cid },
          parent: { uri: parentRef.uri, cid: parentRef.cid },
        },
      });
      if (!continuation) break;
      parentRef = continuation;
    }
  };
  const getXHandle = async () => {
    const findProfileFile = (fileName: string) => {
      for (const [path, file] of fileMap.entries()) {
        if (path.includes(fileName)) {
          return file;
        }
      }
      return null;
    };
    const accountFile = findProfileFile("data/account.js");
    if (!accountFile) {
      throw new Error("account.js file not found in provided data.");
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
      throw new Error("Failed to parse profile data from file");
    }

    return accountJson.username;
  };

  const tweet_to_bsky = async (selectedIds?: string[]) => {
    if (!agent) throw new Error("Agent not found");
    if (!fileMap.size) throw new Error("No files found");

    setIsProcessing(true);
    setProgress(0);

    try {
      const tweetsFile = fileMap.get(tweetsLocation!);
      if (!tweetsFile)
        throw new Error(`Tweets file not found at ${tweetsLocation}`);

      const { tweets, validTweets } = await processTweetsData(
        tweetsFile,
        dateRange
      );

      const filteredTweets = selectedIds
        ? validTweets.filter((t) => selectedIds.includes(t.tweet.id))
        : validTweets;

      let importedTweet = 0;
      const handle = await getXHandle();

      const twitterHandles = [handle.length !== 0 ? handle : "whoisanku"];
      let videoUploadLimits: any | null = null;

      for (const [index, { tweet }] of filteredTweets.entries()) {
        try {
          setProgress(Math.round((index / filteredTweets.length) * 100));
          if (cannotPost(tweet, tweets)) continue;

          const media = tweet.extended_entities?.media;
          const embeddedImage: TEmbeddedImage[] = [];
          let embeddedVideo: BlobRef | undefined = undefined;

          if (tweet.extended_entities?.media) {
            for (const mediaItem of tweet.extended_entities.media) {
              const mediaEmbed = await processMedia(mediaItem, tweet.id);
              if (mediaEmbed) embeddedImage.push(mediaEmbed);
              if (embeddedImage.length >= 4) break; // Limit to 4 images
            }
          }
          if (tweet.in_reply_to_screen_name) {
            if (tweet.in_reply_to_screen_name == twitterHandles[0]) {
              // Remove "@screen_name" from the beginning of the tweet's full text
              const replyPrefix = `@${tweet.in_reply_to_screen_name} `;
              tweet.full_text = tweet.full_text.replace(replyPrefix, "").trim();
            } else {
              continue;
            }
          } else if (tweet.in_reply_to_user_id !== undefined) {
            continue;
          }

          if (media?.[0]?.type === "video") {
            const isEmailConfirmed =
              localStorage.getItem("emailConfirmed") === "true";

            if (!isEmailConfirmed) {
              setSkippedVideos((prev) => [...prev, tweet]);
            } else {
              // Respect current upload limits (daily quotas, policy restrictions, etc).
              if (!videoUploadLimits) {
                try {
                  const { data: svc } = await agent.getServiceAuth({
                    aud: "did:web:video.bsky.app",
                    lxm: "app.bsky.video.getUploadLimits",
                    exp: Date.now() / 1000 + 60 * 30, // 30 minutes
                  });
                  const res = await fetch(
                    "https://video.bsky.app/xrpc/app.bsky.video.getUploadLimits",
                    {
                      headers: {
                        Authorization: `Bearer ${svc.token}`,
                        Accept: "application/json",
                      },
                    }
                  );
                  videoUploadLimits = await res.json().catch(() => null);
                } catch (error) {
                  console.warn("Unable to fetch video upload limits:", error);
                  videoUploadLimits = null;
                }
              }

              if (videoUploadLimits?.canUpload === false) {
                setSkippedVideos((prev) => [...prev, tweet]);
                continue;
              }

              const mediaItem = media[0];
              const highQualityVariant = mediaItem.video_info?.variants.find(
                (variant: VideoVariant) =>
                  variant.bitrate === "2176000" &&
                  variant.content_type === "video/mp4"
              );

              if (highQualityVariant) {
                const video_info = highQualityVariant.url;

                const baseName = video_info.split("/").pop()?.split("?")[0];
                const uploadName = `${tweet.id}-${baseName}`;
                const videoFileName = `${mediaLocation}/${uploadName}`;
                const videoFile = fileMap.get(videoFileName);

                if (videoFile) {
                  const pdsHost = await agent!.getPdsHost();
                  const { data: serviceAuth } = await agent.getServiceAuth({
                    aud: `did:web:${pdsHost}`,
                    lxm: "com.atproto.repo.uploadBlob",
                    exp: Date.now() / 1000 + 60 * 30, // 30 minutes
                  });

                  const token = serviceAuth.token;
                  // Protocol limit: app.bsky.embed.video maxSize is 100_000_000 bytes (~100MB).
                  const MAX_SINGLE_VIDEO_SIZE = 100 * 1024 * 1024;

	                  // Check file size
	                  if (videoFile.size > MAX_SINGLE_VIDEO_SIZE) {
	                    throw new Error(
	                      `File size (${(
	                        videoFile.size /
	                        (1024 * 1024)
	                      ).toFixed(2)}MB) exceeds maximum allowed size of 100MB`
	                    );
	                  }

                  // Prepare upload URL
                  const uploadUrl = new URL(
                    "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo"
                  );
                  uploadUrl.searchParams.append("did", agent.did);
                  uploadUrl.searchParams.append("name", uploadName);

                  let uploadResponse: any;
                  let jobStatus: AppBskyVideoDefs.JobStatus;

                  try {
                    let bytesUploaded = 0;
                    const size = videoFile.size;

                    const progressTrackingStream = new TransformStream({
                      transform(chunk, controller) {
                        controller.enqueue(chunk);
                        bytesUploaded += chunk.byteLength;
                      },
                      flush() {},
                    });

                    const fileStream = videoFile.stream();
                    const uploadStream = fileStream.pipeThrough(
                      progressTrackingStream
                    );

                    interface ExtendedRequestInit extends RequestInit {
                      duplex: "half";
                    }

                    const fetchOptions: ExtendedRequestInit = {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "video/mp4",
                        "Content-Length": String(size),
                        Accept: "application/json",
                      },
                      body: uploadStream,
                      duplex: "half",
                    };

                    uploadResponse = await fetch(
                      uploadUrl.toString(),
                      fetchOptions
                    );

                    if (!uploadResponse.ok) {
                      const errorText = await uploadResponse.text();
                      throw new Error(
                        `Upload failed: ${uploadResponse.status} - ${errorText}`
                      );
                    }

                    jobStatus =
                      (await uploadResponse.json()) as AppBskyVideoDefs.JobStatus;
                  } catch (error: any) {
                    if (error.message.includes("already_exists")) {
                      const errorData = JSON.parse(
                        error.message.split(" - ")[1]
                      );

                      jobStatus = {
                        jobId: errorData.jobId,
                        state: errorData.state,
                        did: errorData.did,
                      } as AppBskyVideoDefs.JobStatus;
                    } else {
                      throw error;
                    }
                  }

                  if (jobStatus.error) {
                  }

                  let blob: BlobRef | undefined = jobStatus.blob;

                  const videoAgent = new AtpAgent({
                    service: "https://video.bsky.app",
                  });

                  while (!blob) {
                    const { data: status } =
                      await videoAgent.app.bsky.video.getJobStatus({
                        jobId: jobStatus.jobId,
                      });

                    if (status.jobStatus.blob) {
                      blob = status.jobStatus.blob;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                  }

                  embeddedVideo = blob;
                } else {
                }
              } else {
              }
            }
          } else {
          }

          const { embeddedUrl = null, embeddedRecord = null } =
            getEmbeddedUrlAndRecord(
              twitterHandles,
              tweet.entities?.urls || [],
              filteredTweets as any
            );

          let replyTo: {} | null = null;

          function getReplyRefs(
            twitterHandles: string[],
            tweetData: {
              in_reply_to_screen_name?: string;
              in_reply_to_status_id?: string;
            },
            tweets: Array<{
              tweet: Tweet["tweet"];
              bsky?: { uri: string; cid: string };
            }>
          ): {
            root: {
              uri: string;
              cid: string;
            };
            parent: {
              uri: string;
              cid: string;
            };
          } | null {
            const { in_reply_to_screen_name, in_reply_to_status_id } =
              tweetData;

            // Validate reply screen name
            if (
              !in_reply_to_screen_name ||
              !twitterHandles.some(
                (handle) => handle === in_reply_to_screen_name
              )
            ) {
              return null;
            }

            // Find the immediate parent tweet
            const parent = tweets.find(
              ({ tweet }) => tweet.id === in_reply_to_status_id
            );

            // If no parent found, return null
            if (!parent) {
              return null;
            }

            // Find the root of the thread
            let root = parent;
            while (root?.tweet?.in_reply_to_status_id) {
              const nextRoot = tweets.find(
                ({ tweet }) => tweet.id === root.tweet.in_reply_to_status_id
              );

              if (!nextRoot) break;
              root = nextRoot;
            }

            // Validate Bluesky metadata
            if (!parent.bsky || !root.bsky) {
              return null;
            }

            return {
              root: {
                uri: root.bsky.uri,
                cid: root.bsky.cid,
              },
              parent: {
                uri: parent.bsky.uri,
                cid: parent.bsky.cid,
              },
            };
          }
          if (tweet.in_reply_to_screen_name) {
            replyTo = getReplyRefs(
              twitterHandles,
              {
                in_reply_to_screen_name: tweet.in_reply_to_screen_name,
                in_reply_to_status_id: tweet.in_reply_to_status_id,
              },
              filteredTweets
            );
          }
          let externalEmbed = null;

          // Other than t.co url within full text
          function extractUrlsFromText(text: string): string[] {
            // Regular expression to match URLs in text
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            return (text.match(urlRegex) || []).filter(
              (url) =>
                !url.startsWith("https://twitter.com") &&
                !url.startsWith("https://x.com") &&
                !url.startsWith("https://t.co/")
            );
          }

          function removeUrlsFromText(text: string): string {
            // Regex to match URLs along with adjacent non-space characters
            const urlRegex =
              /[()[\]{}"']*\s*(https?:\/\/[^\s()]+)\s*[()[\]{}"']*/g;

            // Remove URLs and their immediately adjacent punctuation
            const cleanedText = text.replace(urlRegex, "").trim();

            return cleanedText;
          }
          // For t.co urls within full text
          if (tweet.entities?.urls) {
            for (const urlEntity of tweet.entities.urls) {
              if (
                !urlEntity.expanded_url.startsWith("https://twitter.com") &&
                !urlEntity.expanded_url.startsWith("https://x.com")
              ) {
                try {
                  externalEmbed = await fetchEmbedUrlCard(
                    urlEntity.expanded_url,
                    agent!.agent
                  );
                } catch (error: any) {
                  console.warn(
                    `Error fetching embed URL card: ${error.message}`
                  );
                }
              }
            }
          }

          const textUrls = extractUrlsFromText(tweet.full_text);
          if (textUrls.length > 0) {
            try {
              const embed = await fetchEmbedUrlCard(textUrls[0], agent!.agent);
              if (embed) {
                externalEmbed = embed;
              }
            } catch (error: any) {
              console.warn(
                `Error fetching embed URL card from full_text: ${error.message}`
              );
            }
          }

          await createPostRecord(
            tweet,
            embeddedImage,
            embeddedVideo,
            embeddedRecord,
            externalEmbed,
            replyTo,
            filteredTweets,
            index
          ).then(() => {
            importedTweet++;
          });
        } catch (error) {
          console.error(`Error processing tweet ${tweet.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error during import:", error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  return {
    isProcessing,
    progress,
    tweet_to_bsky,
    skippedVideos,
  };
};
