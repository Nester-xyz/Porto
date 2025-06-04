import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Render2Props } from "@/types/render";
import { useEffect, useState } from "react";
import { useUpload } from "@/hooks/useUpload";

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
  const { isProcessing, progress, tweet_to_bsky } = useUpload({ shareableData });

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

  const emailConfirmed = localStorage.getItem("emailConfirmed");

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
          <>
                onClick={() =>
                  selectedIds.length === filteredTweets.length
                    ? setSelectedIds([])
                    : setSelectedIds(filteredTweets.map((t) => t.tweet.id))
                }
                {selectedIds.length === filteredTweets.length
                  ? "Deselect All"
                  : "Select All"}
            <Card className="p-4 max-h-60 overflow-y-auto">
              <h3 className="font-semibold mb-2">
                Select Tweets ({selectedIds.length})
              </h3>
              <div className="space-y-2">
                {displayTweets.map((t) => (
                  <label key={t.tweet.id} className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.tweet.id)}
                      onChange={() => toggleId(t.tweet.id)}
                    />
                    <span className="text-sm text-gray-700">
                      {t.tweet.full_text}
                    </span>
                  </label>
                ))}
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
          </>
          {isProcessing && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
              disabled={isProcessing}
              onClick={async () => {
                setShareableData({ ...shareableData, selectedTweetIds: selectedIds });
                await tweet_to_bsky(selectedIds);
              disabled={selectedIds.length === 0 || isProcessing}
              {isProcessing ? "Processing..." : "Import to Bluesky"}
      </div>

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
            Excluded: {totalTweets - validTweets} (quotes, retweets, replies, or
            outside date range)
          </p>
        </div>
      </Card>

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
                <span className="text-sm text-gray-700">
                  {t.tweet.full_text}
                </span>
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

      <div className="flex space-x-4">
        <Button
          onClick={() => setCurrentStep(1)}
          variant="outline"
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={() => {
            setShareableData({
              ...shareableData,
              selectedTweetIds: selectedIds,
            });
            setCurrentStep(3);
          }}
          className="flex-1"
          disabled={selectedIds.length === 0}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default RenderStep2;
