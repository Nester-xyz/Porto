import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BLUESKY_USERNAME } from "@/lib/constant";
import { Render3Props } from "@/types/render";
import { CheckCircle } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { useEffect, useState } from "react";

const RenderStep3: React.FC<Render3Props> = ({
  shareableData,
  setCurrentStep,
}) => {
  const { totalTweets, validTweets, validTweetsData, selectedTweetIds } =
    shareableData;
  const { isProcessing, progress, tweet_to_bsky } = useUpload({
    shareableData,
  });
  const [completed, setCompleted] = useState(false);

  const ids = selectedTweetIds.length
    ? selectedTweetIds
    : (validTweetsData?.map((t) => t.tweet.id) ?? []);

  useEffect(() => {
    if (!isProcessing && progress === 100) {
      setCompleted(true);
    }
  }, [isProcessing, progress]);

  if (!completed) {
    return (
      <div className="space-y-6">
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
              onClick={() => setCurrentStep(2)}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              Back
            </Button>
            <Button
              onClick={() => tweet_to_bsky(ids)}
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Import to Bluesky"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Import Complete!
          </h2>
          <p className="text-gray-600 mb-6">
            Your tweets have been successfully imported to Bluesky
          </p>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Import Summary</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Total tweets found: {totalTweets}
            </p>
            <p className="text-sm text-gray-600">
              Successfully imported: {validTweets}
            </p>
            <p className="text-sm text-gray-600">
              Skipped: {totalTweets - validTweets} (retweets, replies, or
              outside date range)
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-none">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-gray-900">Support Our Work</h3>
            <p className="text-sm text-gray-600">
              If you found this tool helpful, consider supporting us to keep it
              free and maintained
            </p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transform transition hover:scale-105"
              onClick={() =>
                window.open("https://ko-fi.com/nesterdev", "_blank")
              }
            >
              Donate us on Ko-Fi
            </Button>
          </div>
        </Card>

        <div className="flex space-x-4 mt-4">
          <Button
            onClick={() => {
              setCurrentStep(1);
            }}
            variant="outline"
            className="flex-1"
          >
            Import More Tweets
          </Button>
          <Button
            onClick={() =>
              window.open(
                `https://bsky.app/profile/${BLUESKY_USERNAME}.bsky.social`,
                "_blank"
              )
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Open Bluesky
          </Button>
        </div>
      </div>
    </div>
  );
};
export default RenderStep3;
