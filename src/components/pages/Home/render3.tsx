import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BLUESKY_USERNAME } from "@/lib/constant";
import { Render3Props } from "@/types/render";
import { CheckCircle } from "lucide-react";
import { Tweet } from "@/types/tweets";

const RenderStep3: React.FC<Render3Props> = ({
  shareableData,
  setCurrentStep,
}) => {
  const { totalTweets, validTweetsData, selectedTweetIds, skippedVideos } =
    shareableData;
  const importedCount = selectedTweetIds.length
    ? selectedTweetIds.length
    : (validTweetsData?.length ?? 0);
  const skippedCount = totalTweets - importedCount;

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Import Complete!
          </h2>
          <p className="text-muted-foreground mb-6">
            Your tweets have been successfully imported to Bluesky
          </p>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Import Summary</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Total tweets found: {totalTweets}
            </p>
            <p className="text-sm text-muted-foreground">
              Successfully imported: {importedCount}
            </p>
            <p className="text-sm text-muted-foreground">
              Skipped: {skippedCount} (unselected or invalid)
            </p>
          </div>
        </Card>

        {skippedVideos && skippedVideos.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Tweets with Skipped Videos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The following tweets had videos that were not uploaded because
              your email is not confirmed on Bluesky.
            </p>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {skippedVideos.map((tweet: Tweet["tweet"]) => (
                <div key={tweet.id} className="p-2 border rounded-md">
                  <p className="text-sm">{tweet.full_text}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-none">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-foreground">Support Our Work</h3>
            <p className="text-sm text-muted-foreground">
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
            onClick={() => setCurrentStep(1)}
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
            className="flex-1 dark:text-white bg-blue-600 hover:bg-blue-700"
          >
            Open Bluesky
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RenderStep3;
