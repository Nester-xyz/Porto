import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Render2Props } from "@/types/render";
import { useEffect, useState } from "react";
import { useUpload } from "@/hooks/useUpload";
import { Tweet } from "@/types/tweets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

const RenderStep2: React.FC<Render2Props> = ({
  setCurrentStep,
  shareableData,
  setShareableData,
}) => {
  const { totalTweets, validTweets, validTweetsData, selectedTweetIds } =
    shareableData;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(true);
  const [tweetsWithVideos, setTweetsWithVideos] = useState<Tweet[]>([]);

  const { isProcessing, progress, tweet_to_bsky, skippedVideos } = useUpload({
    shareableData,
  });

  useEffect(() => {
    const emailConfirmed = localStorage.getItem("emailConfirmed") === "true";
    setIsEmailConfirmed(emailConfirmed);
  }, []);

  useEffect(() => {
    if (validTweetsData) {
      const videoTweets = validTweetsData.filter(
        (t) => t.tweet.extended_entities?.media?.[0]?.type === "video"
      );
      setTweetsWithVideos(videoTweets);
    }
  }, [validTweetsData]);

  useEffect(() => {
    if (selectedTweetIds && selectedTweetIds.length > 0) {
      setSelectedIds(selectedTweetIds);
    } else if (validTweetsData) {
      setSelectedIds(validTweetsData.map((t) => t.tweet.id));
    }
  }, [validTweetsData, selectedTweetIds]);

  useEffect(() => {
    if (!isProcessing && progress === 100 && selectedIds.length > 0) {
      setShareableData({ ...shareableData, selectedTweetIds: selectedIds });
      setCurrentStep(3);
    }
  }, [isProcessing, progress]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const filteredTweets =
    validTweetsData?.filter((t) =>
      t.tweet.full_text.toLowerCase().includes(query.toLowerCase())
    ) || [];

  const displayTweets = filteredTweets.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Tweet Analysis</h3>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Total tweets found: {totalTweets}
          </p>
          <p className="text-sm text-muted-foreground">
            Valid tweets to import: {validTweets}
          </p>
          <p className="text-sm text-muted-foreground">
            Excluded: {totalTweets - validTweets} (quotes, retweets, replies, or
            outside date range)
          </p>
          {!isEmailConfirmed && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-yellow-700 dark:text-yellow-500">
                Your email isn't verified. Videos won't be uploaded.
              </p>
              {tweetsWithVideos.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tweets with Videos</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {tweetsWithVideos.map((t) => (
                        <div key={t.tweet.id} className="p-2 border rounded-md">
                          <p className="text-sm">{t.tweet.full_text}</p>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="flex mb-2 space-x-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(50);
          }}
          placeholder="Search tweets..."
          className="flex-1 dark:bg-gray-800 px-2 py-1 border rounded-md"
        />
        <Button
          variant="outline"
          onClick={() =>
            selectedIds.length === filteredTweets.length
              ? setSelectedIds([])
              : setSelectedIds(filteredTweets.map((t) => t.tweet.id))
          }
        >
          {selectedIds.length === filteredTweets.length
            ? "Deselect All"
            : "Select All"}
        </Button>
      </div>

      {validTweetsData && (
        <Card className="p-4 max-h-60 overflow-y-auto">
          <h3 className="font-semibold mb-2">
            Select Tweets ({selectedIds.length})
          </h3>
          <div className="space-y-2">
            {displayTweets.map((t) => (
              <label key={t.tweet.id} className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.includes(t.tweet.id)}
                  onChange={() => toggleId(t.tweet.id)}
                />
                <span className="text-sm">{t.tweet.full_text}</span>
              </label>
            ))}
          </div>
          {filteredTweets.length > visibleCount && (
            <div className="mt-2 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + 50)}
              >
                Load More
              </Button>
            </div>
          )}
        </Card>
      )}

      {isProcessing && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      <div className="flex space-x-4">
        <Button
          onClick={() => setCurrentStep(1)}
          variant="outline"
          className="flex-1"
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button
          onClick={async () => {
            setShareableData({
              ...shareableData,
              selectedTweetIds: selectedIds,
              skippedVideos: skippedVideos,
            });
            await tweet_to_bsky(selectedIds);
          }}
          className="flex-1"
          disabled={selectedIds.length === 0 || isProcessing}
        >
          {isProcessing ? "Processing..." : "Import to Bluesky"}
        </Button>
      </div>
    </div>
  );
};

export default RenderStep2;
