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
      console.log(`Import started at ${new Date().toISOString()}`);
      console.log(`Simulate is ${simulate ? "ON" : "OFF"}`);

      const tweetsFile = fileMap.get(tweetsLocation!);
      if (!tweetsFile) {
        throw new Error(`Tweets file not found at ${tweetsLocation}`);
      }

      const tweetsFileContent = await tweetsFile.text();
      const tweets = parseTweetsFile(tweetsFileContent);

      if (!Array.isArray(tweets)) {
        throw new Error("Parsed content is not an array");
      }

      let importedTweet = 0;

      const sortedTweets = sortTweetsWithDateRange(tweets, dateRange);
      console.log(sortedTweets);

      for (const [index, { tweet }] of sortedTweets.entries()) {
        try {
          setProgress(Math.round((index / sortedTweets.length) * 100));
          const tweetDate = new Date(tweet.created_at);
          const tweet_createdAt = tweetDate.toISOString();

          if (!isPostValid(tweet) || isQuote(tweets, tweet.id)) {
            continue;
          }

          let embeddedImage = [] as any;
          let embeddedVideo = undefined as BlobRef | undefined;
          let hasVideo = false;

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
                const media = tweet.extended_entities?.media?.[0];
                console.log(media);

                const highQualityVariant = media.video_info.variants.find(
                  (variant: VideoVariant) => variant.bitrate === '2176000' && variant.content_type === 'video/mp4'
                );
                const video_info = highQualityVariant.url;

                const videoFileName = `${mediaLocation}/${tweet.id}-${video_info.split('/').pop()?.split('?')[0]}`;
                console.log(videoFileName);
                const videoFile = fileMap.get(videoFileName);
                const { data: serviceAuth } = await agent!.com.atproto.server.getServiceAuth(
                  {
                    aud: `did:web:${agent!.dispatchUrl.host}`,
                    lxm: "com.atproto.repo.uploadBlob",
                    exp: Date.now() / 1000 + 60 * 30, // 30 minutes
                  },
                );

                const token = serviceAuth.token;
                const MAX_SINGLE_VIDEO_SIZE = 10 * 1024 * 1024 * 1024; // 10GB max size

                // Check file size
                if (videoFile.size > MAX_SINGLE_VIDEO_SIZE) {
                  throw new Error(`File size (${(videoFile.size / (1024 * 1024 * 1024)).toFixed(2)}GB) exceeds maximum allowed size of 10GB`);
                }
                // Prepare upload URL
                const uploadUrl = new URL(
                  "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo"

                );
                uploadUrl.searchParams.append("did", agent!.session!.did);
                uploadUrl.searchParams.append("name", videoFileName);



                console.log("Starting upload request...", {
                  fileSize: `${(videoFile.size / (1024 * 1024)).toFixed(2)}MB`,
                  fileName: videoFile.name
                });
                let uploadResponse: any;
                let jobStatus: any;
                try {
                  // Initialize upload progress tracking
                  let bytesUploaded = 0;
                  const size = videoFile.size;

                  // Create a transform stream for progress tracking
                  const progressTrackingStream = new TransformStream({
                    transform(chunk, controller) {
                      controller.enqueue(chunk);
                      bytesUploaded += chunk.byteLength;
                      // Log progress percentage
                      console.log(
                        "Upload progress:",
                        Math.trunc((bytesUploaded / size) * 100) + "%"
                      );
                    },
                    flush() {
                      console.log("Upload complete ✨");
                    }
                  });

                  // Create upload URL with parameters
                  const uploadUrl = new URL(
                    "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo"
                  );
                  uploadUrl.searchParams.append("did", agent!.session!.did);
                  uploadUrl.searchParams.append("name", videoFile.name);

                  // Convert file to stream and pipe through progress tracker
                  const fileStream = videoFile.stream();
                  const uploadStream = fileStream.pipeThrough(progressTrackingStream);

                  interface ExtendedRequestInit extends RequestInit {
                    duplex: 'half';
                  }

                  const fetchOptions: ExtendedRequestInit = {
                    method: "POST",
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'video/mp4',
                      'Content-Length': String(size),
                      'Accept': 'application/json',
                    },
                    body: uploadStream,
                    duplex: 'half',
                  };
                  // Perform upload
                  uploadResponse = await fetch(uploadUrl.toString(), fetchOptions);

                  if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
                  }


                  jobStatus = (await uploadResponse.json()) as AppBskyVideoDefs.JobStatus;
                  console.log('Upload successful:', jobStatus);
                } catch (error: any) {

                  if (error.message.includes('already_exists')) {
                    // Extract jobId from error message
                    const errorData = JSON.parse(error.message.split(' - ')[1]);
                    console.log('Using existing video jobId:', errorData.jobId);
                    jobStatus = {
                      jobId: errorData.jobId,
                      state: errorData.state,
                      did: errorData.did
                    } as AppBskyVideoDefs.JobStatus;
                  } else {
                    console.error('Upload error:', error);
                    throw error;
                  }
                }
                if (jobStatus.error) {
                  console.warn(` Video job status: '${jobStatus.error}'. Video will be posted as a link`);
                }
                console.log(" JobId:", jobStatus.jobId);

                let blob: BlobRef | undefined = jobStatus.blob;

                const videoAgent = new AtpAgent({ service: "https://video.bsky.app" });

                while (!blob) {
                  const { data: status } = await videoAgent.app.bsky.video.getJobStatus(
                    { jobId: jobStatus.jobId },
                  );
                  console.log("  Status:",
                    status.jobStatus.state,
                    status.jobStatus.progress || "",
                  );
                  if (status.jobStatus.blob) {
                    blob = status.jobStatus.blob;
                  }
                  // wait a second
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                embeddedVideo = blob;
              } else {
                console.log("Skipping non-photo, non-video media type:", media.type);
                continue;
              }
              hasVideo = true;
              break;
            }
          }
          console.log(`Final post will contain ${embeddedImage.length} images and ${embeddedVideo ? 1 : 0} videos`);
          let postText = tweet.full_text;
          if (!simulate) {
            postText = await cleanTweetText(tweet.full_text);
            if (postText.length > 300) {
              postText = postText.substring(0, 296) + "...";
            }
          }

          const rt = new RichText({ text: postText });
          await rt.detectFacets(agent);

          console.log();

          const postRecord = {
            $type: "app.bsky.feed.post",
            text: rt.text,
            facets: rt.facets,
            createdAt: tweet_createdAt,
            embed:
              embeddedImage.length > 0
                ? { $type: "app.bsky.embed.images", images: embeddedImage }
                : undefined,
          };

          const embed = getMergeEmbed(embeddedImage, embeddedVideo);
          if (embed && Object.keys(embed).length > 0) {
            Object.assign(postRecord, { embed });
          }
          if (!simulate) {
            await new Promise((resolve) => setTimeout(resolve, ApiDelay));
            const recordData = await agent.post(postRecord);
            const postRkey = recordData.uri.split("/").pop();
            if (postRkey) {
              const postUri = `https://bsky.app/profile/${BLUESKY_USERNAME}/post/${postRkey}`;
              console.log(postUri);
              console.log("Bluesky post created:", postRecord.text);
              importedTweet++;
            }
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
                tweet_to_bsky();
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
