import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BLUESKY_USERNAME } from "@/lib/constant";
import { CheckCircle } from "lucide-react";

const RenderStep3 = ({
  totalTweets,
  validTweets,
}: {
  totalTweets: number;
  validTweets: number;
}) => (
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
            Skipped: {totalTweets - validTweets} (retweets, replies, or outside
            date range)
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
              window.open(
                "https://www.paypal.com/donate/?hosted_button_id=PFD7AXJMPSDYJ",
                "_blank",
              )
            }
          >
            Donate
          </Button>
        </div>
      </Card>

      <div className="flex space-x-4 mt-4">
        <Button onClick={() => {}} variant="outline" className="flex-1">
          Import More Tweets
        </Button>
        <Button
          onClick={() =>
            window.open(
              `https://bsky.app/profile/${BLUESKY_USERNAME}.bsky.social`,
              "_blank",
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

export default RenderStep3;
