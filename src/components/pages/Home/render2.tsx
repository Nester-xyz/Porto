import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLogInContext } from "@/hooks/LogInContext";
import { ApiDelay, BLUESKY_USERNAME } from "@/lib/constant";
import {
  sendFileInChunks,
} from "@/lib/parse/parse";
import { Render2Props } from "@/types/render";
import { useState, useEffect } from "react";

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
    totalTweets,
    tweetsLocation,
    validTweets,
  } = shareableData;


  useEffect(() => {
    const handleProgress = (message: any) => {
      if (message.action === "importProgress") {
        setProgress(message.state.progress);
      }
      if (message.action === "importComplete") {
        setIsProcessing(false);
        setProgress(100);
      }
    };

    chrome.runtime.onMessage.addListener(handleProgress);
    return () => chrome.runtime.onMessage.removeListener(handleProgress);
  }, []);

  const tweet_to_bsky = async () => {
    if (!agent) {
      console.log("No agent found");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const tweetsFile = fileMap.get(tweetsLocation!);
      if (!tweetsFile) {
        throw new Error(`Tweets file not found at ${tweetsLocation}`);
      }

      console.log('Starting file transfer process...');

      // Send tweets file in chunks
      const tweetsFileId = await sendFileInChunks(tweetsFile);
      console.log('Tweets file transfer complete, ID:', tweetsFileId);

      // Small delay to ensure all chunks are processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Prepare media files
      const mediaFileIds: Record<string, string> = {};
      for (const [path, file] of fileMap.entries()) {
        if (path.includes('tweets_media') && file.size > 0) {
          const fileId = await sendFileInChunks(file);
          mediaFileIds[file.name] = fileId;
          // Small delay between files
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('All files transferred, starting import...');

      // Start the import process
      await chrome.runtime.sendMessage({
        action: "startImport",
        data: {
          tweetsFileId,
          mediaFileIds,
          BLUESKY_USERNAME,
          ApiDelay,
          simulate,
          dateRange
        }
      });


    } catch (error) {
      console.error("Error in tweet_to_bsky:", error);
      setIsProcessing(false);
      throw error;
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
            {(progress === 0 && isProcessing) && (
              <Badge variant="destructive">Chunks are being loaded, don't close this window.</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenderStep2;
