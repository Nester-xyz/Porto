import { useMemo, useState } from "react";
import { useLogInContext } from "./LogInContext";
import { shareableData } from "@/types/render";
import { processTweetsData } from "@/lib/parse/processTweets";
import { cleanTweetText, isPostValid, isQuote } from "@/lib/parse/parse";
import { TMedia, TEmbeddedImage, Tweet } from "@/types/tweets";
import { RichText } from "@atproto/api";
import { getMergeEmbed } from "@/components/utils";
import { ApiDelay, BLUESKY_USERNAME } from "@/lib/constant";

export const filePassableType = (fileType: string = ""): string => {
  if (fileType === "png") return "image/png";
  if (fileType === "jpg") return "image/jpeg";
  return "";
};

const cannotPost = (
  singleTweet: Tweet["tweet"],
  tweetsArray: Tweet[],
): boolean =>
  !isPostValid(singleTweet) || isQuote(tweetsArray, singleTweet.id);

export const useUpload = ({
  shareableData,
}: {
  shareableData: shareableData;
}) => {
  const { agent } = useLogInContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const simulate = useMemo(() => true, []);

  const { fileMap, dateRange, mediaLocation, tweetsLocation } = shareableData;

  const processMedia = async (
    media: TMedia,
    tweetId: string,
  ): Promise<TEmbeddedImage | null> => {
    if (media.type !== "photo") {
      console.log("Skipping non-photo media type:", media.type);
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

    if (!simulate) {
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
    }

    return null; // Simulation mode does not upload
  };

  const createPostRecord = async (
    tweet: Tweet["tweet"],
    embeddedImage: TEmbeddedImage[],
  ) => {
    if (!agent) return;
    let postText = await cleanTweetText(tweet.full_text);

    if (postText.length > 300) postText = postText.substring(0, 296) + "...";

    // URLs handled
    const urls = tweet.entities?.urls?.map((url) => url.display_url) || [];

    if (!simulate) {
      postText = await cleanTweetText(tweet.full_text);
      if (postText.length > 300) postText = postText.substring(0, 296) + "...";
    }

    if (urls.length > 0) postText += `\n\n${urls.join(" ")}`;

    // rich texts
    const rt = new RichText({ text: postText });
    await rt.detectFacets(agent);

    const tweetCreatedAt = new Date(tweet.created_at).toISOString();

    const postRecord = {
      $type: "app.bsky.feed.post",
      text: rt.text,
      facets: rt.facets,
      createdAt: tweetCreatedAt,
      embed:
        embeddedImage.length > 0
          ? { $type: "app.bsky.embed.images", images: embeddedImage }
          : undefined,
    };

    console.log(postRecord);

    // Merge any additional embed data
    const embed = getMergeEmbed(embeddedImage);
    if (embed && Object.keys(embed).length > 0) {
      Object.assign(postRecord, { embed });
    }

    await new Promise((resolve) => setTimeout(resolve, ApiDelay)); // Throttle API calls
    const recordData = await agent?.post(postRecord);
    const postRkey = recordData?.uri.split("/").pop();
    if (postRkey) {
      const postUri = `https://bsky.app/profile/${BLUESKY_USERNAME}/post/${postRkey}`;
      console.log("Bluesky post created:", postRecord.text);
      console.log(postUri);
    }
  };

  const tweet_to_bsky = async () => {
    if (!agent) throw new Error("Agent not found");
    if (!fileMap.size) throw new Error("No files found");

    setIsProcessing(true);
    setProgress(0);

    try {
      console.info(`Import started at ${new Date().toISOString()}`);

      const tweetsFile = fileMap.get(tweetsLocation!);
      if (!tweetsFile)
        throw new Error(`Tweets file not found at ${tweetsLocation}`);

      const { tweets, validTweets } = await processTweetsData(
        tweetsFile,
        dateRange,
      );

      let importedTweet = 0;

      for (const [index, { tweet }] of validTweets.entries()) {
        try {
          setProgress(Math.round((index / validTweets.length) * 100));
          if (cannotPost(tweet, tweets)) continue;

          const embeddedImage: TEmbeddedImage[] = [];
          if (tweet.extended_entities?.media) {
            for (const media of tweet.extended_entities.media) {
              const mediaEmbed = await processMedia(media, tweet.id);
              if (mediaEmbed) embeddedImage.push(mediaEmbed);
              if (embeddedImage.length >= 4) break; // Limit to 4 images
            }
          }

          await createPostRecord(tweet, embeddedImage).then(() => {
            importedTweet++;
          });
        } catch (error) {
          console.error(`Error processing tweet ${tweet.id}:`, error);
        }
      }

      console.log(`Import completed. ${importedTweet} tweets imported.`);
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
  };
};
