import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLogInContext } from "@/hooks/LogInContext";
import { ApiDelay, BLUESKY_USERNAME } from "@/lib/constant";
import {
  cleanTweetText,
  isPostValid,
  isQuote,
  parseTweetsFile,
  sortTweetsWithDateRange,
} from "@/lib/parse/parse";
import { Render2Props, shareableData } from "@/types/render";
import AtpAgent, { AppBskyVideoDefs, BlobRef, RichText } from "@atproto/api";
import { getMergeEmbed } from "@/components/utils";
import { useState } from "react";

const RenderStep2: React.FC<Render2Props> = ({
  setCurrentStep,
  shareableData,
}) => {
  const { agent } = useLogInContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulate, setSimulate] = useState(false);

  const {
    fileMap,
    dateRange,
    mediaLocation,
    totalTweets,
    tweetsLocation,
    validTweets,
  } = shareableData;

  const tweet_to_bsky = async () => {
    if (!agent) throw new Error("Agent not found");
    if (!fileMap.size) {
      console.log("No files selected");
      return;
    }
    setIsProcessing(true);
    setProgress(0);
  
    try {
      const tweetsFile = fileMap.get(tweetsLocation!);
      if (!tweetsFile) throw new Error(`Tweets file not found at ${tweetsLocation}`);
  
      const tweetsFileContent = await tweetsFile.text();
      const tweets = parseTweetsFile(tweetsFileContent);
  
      if (!Array.isArray(tweets)) throw new Error("Parsed content is not an array");
  
      let importedTweet = 0;
  
      const sortedTweets = sortTweetsWithDateRange(tweets, dateRange);
  
      for (const [index, { tweet }] of sortedTweets.entries()) {
        try {
          setProgress(Math.round((index / sortedTweets.length) * 100));
          const tweetDate = new Date(tweet.created_at);
          const tweet_createdAt = tweetDate.toISOString();
  
          if (!isPostValid(tweet) || isQuote(tweets, tweet.id)) continue;
  
          let embeddedImage = [] as any;
          let embeddedVideo: BlobRef | undefined = undefined;
          let hasVideo = false;
  
          // Process media for embedding
          if (tweet.extended_entities?.media) {
            for (const media of tweet.extended_entities.media) {
              if (media.type === "photo") {
                const fileType = media.media_url.split(".").pop();
                const mimeType =
                  fileType === "png"
                    ? "image/png"
                    : fileType === "jpg"
                    ? "image/jpeg"
                    : "";
  
                if (!mimeType) continue;
                if (embeddedImage.length >= 4) break;
  
                const mediaFilename = `${mediaLocation}/${tweet.id}-${media.media_url.split("/").pop()}`;
                const imageFile = fileMap.get(mediaFilename);
  
                if (imageFile) {
                  const imageBuffer = await imageFile.arrayBuffer();
                  if (!simulate) {
                    const blobRecord = await agent.uploadBlob(imageBuffer, {
                      encoding: mimeType,
                    });
  
                    embeddedImage.push({
                      alt: "",
                      image: {
                        $type: "blob",
                        ref: blobRecord.data.blob.ref,
                        mimeType: blobRecord.data.blob.mimeType,
                        size: blobRecord.data.blob.size,
                      },
                    });
                  }
                }
              } else if (media.type === "video") {
                // Handle video uploads (logic as provided earlier)
                embeddedVideo = await handleVideoUpload(media, agent, mediaLocation, tweet.id);
                hasVideo = true;
                break; // Only one video can be embedded
              } else {
                console.log("Skipping non-photo, non-video media type:", media.type);
                continue;
              }
            }
          }
          console.log(`Final post will contain ${embeddedImage.length} images and ${embeddedVideo ? 1 : 0} videos`);
          let postText = tweet.full_text;
          const urls = tweet.entities?.urls?.map((url) => url.display_url) || [];
  
          if (!simulate) {
            postText = await cleanTweetText(tweet.full_text);
            if (postText.length > 300) postText = postText.substring(0, 296) + "...";
          }
  
          if (urls.length > 0) postText += `\n\n${urls.join(" ")}`;
  
          const rt = new RichText({ text: postText });
          await rt.detectFacets(agent);
  
          if (embeddedImage.length > 1) console.log("The embedded images are:", embeddedImage);
  
          const postRecord = {
            $type: "app.bsky.feed.post",
            text: rt.text,
            facets: rt.facets,
            createdAt: tweet_createdAt,
            embed: {
              $type: "app.bsky.embed.images",
              images: embeddedImage,
            },
          };
  
          console.log("This is the post record payload", postRecord);
  
          const embed = getMergeEmbed(embeddedImage, embeddedVideo);
          if (embed && Object.keys(embed).length > 0) Object.assign(postRecord, { embed });
  
          if (!simulate) {
            await new Promise((resolve) => setTimeout(resolve, ApiDelay));
            const recordData = await agent.post(postRecord);
            const postRkey = recordData.uri.split("/").pop();
            if (postRkey) importedTweet++;
          } else {
            importedTweet++;
          }
        } catch (error) {
          console.error(`Error processing tweet ${tweet.id}:`, error);
        }
      }
      setCurrentStep(3);
      console.log(`Import completed. ${importedTweet} tweets imported.`);
    } catch (error) {
      console.error("Error during import:", error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Tweet Analysis</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Total tweets found: {totalTweets}
            </p>
            <p className="text-sm text-gray-600">
              Valid tweets to import: {validTweets}
            </p>
            <p className="text-sm text-gray-600">
              Excluded: {totalTweets - validTweets} (quotes, retweets, replies,
              or outside date range)
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {isProcessing && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
          <div className="flex space-x-4">
            <Button
              onClick={() => {
                setCurrentStep(1);
              }}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              Back
            </Button>
            <Button
              onClick={() => {
                setSimulate(false);
               tweet_to_bsky()
              }}
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Import to Bluesky"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenderStep2;

