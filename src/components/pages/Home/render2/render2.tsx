import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Render2Props } from "@/types/render";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (selectedTweetIds && selectedTweetIds.length > 0) {
      setSelectedIds(selectedTweetIds);
    } else if (validTweetsData) {
      setSelectedIds(validTweetsData.map((t) => t.tweet.id));
    }
  }, [validTweetsData, selectedTweetIds]);

  const emailConfirmed = localStorage.getItem("emailConfirmed");

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
      {emailConfirmed === "false" && (
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4"
          role="alert"
        >
          Your videos are excluded because you haven't confirmed your email on
          Bluesky.
        </div>
      )}
      <div className="flex mb-2 space-x-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(50);
          }}
          placeholder="Search tweets..."
          className="flex-1 px-2 py-1 border rounded"
        />
        <Button
          variant="outline"
          onClick={() => setSelectedIds([])}
          disabled={selectedIds.length === 0}
        >
          Deselect All
        </Button>
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
