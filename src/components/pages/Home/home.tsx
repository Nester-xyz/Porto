import { Button } from "@/components/ui/button";
import { useLogInContext } from "@/hooks/LogInContext";
import { RichText } from "@atproto/api";
import he from "he";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import URI from "urijs";
import FileFoundCard from "@/components/FileFoundCard";

interface DateRange {
  min_date: Date | undefined;
  max_date: Date | undefined;
}

type TcheckFile = (fileName: string) => boolean;

interface Tweet {
  tweet: {
    created_at: string;
    id: string;
    full_text: string;
    in_reply_to_screen_name: string | null;
    extended_entities?: {
      media: {
        type: string;
        media_url: string;
      }[];
    };
  };
}

const Home = () => {
  const { agent } = useLogInContext();
  const [simulate, setSimulate] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    min_date: undefined,
    max_date: undefined,
  });
  const ApiDelay = 2500;
  const BLUESKY_USERNAME = "khadgaprasadoli";
  const [files, setFiles] = useState<FileList | null>(null);
  const [tweetsLocation, setTweetsLocation] = useState<string | null>(null);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const findFile = (fileName: string): File | null => {
    if (!fileMap || fileMap.size === 0) return null;

    const filePath = Array.from(fileMap.keys()).find((filePath) => {
      const pathParts = filePath.split("/");
      const actualFileName = pathParts[pathParts.length - 1];

      // Check for exact match of the filename
      return actualFileName === fileName;
    });

    return filePath ? fileMap.get(filePath) || null : null;
  };

  const CheckFile: TcheckFile = (filename: string) => {
    return !!findFile(filename);
  };

  useEffect(() => {
    if (files) {
      const map = new Map();
      for (const file of files) {
        map.set(file.webkitRelativePath, file);
      }
      setFileMap(map);
    }
  }, [files]);

  useEffect(() => {
    const file = findFile("tweets.js");
    setTweetsLocation(file ? file.webkitRelativePath : null);
  }, [fileMap]);

  async function resolveShortURL(url: string) {
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      return response.url;
    } catch (error) {
      console.warn(`Error parsing url ${url}:`, error);
      return url;
    }
  }

  async function cleanTweetText(tweetFullText: string): Promise<string> {
    let newText = tweetFullText;
    const urls: string[] = [];
    URI.withinString(tweetFullText, (url) => {
      urls.push(url);
      return url;
    });

    if (urls.length > 0) {
      const newUrls = await Promise.all(urls.map(resolveShortURL));
      let j = 0;
      newText = URI.withinString(tweetFullText, (url) => {
        if (newUrls[j].indexOf("/photo/") > 0) {
          j++;
          return "";
        }
        return newUrls[j++];
      });
    }

    newText = he.decode(newText);
    return newText;
  }

  const parseTweetsFile = (content: string): Tweet[] => {
    console.log(content, "this is content");
    try {
      return JSON.parse(content);
    } catch {
      try {
        const jsonContent = content
          .replace(/^window\.YTD\.tweets\.part0\s*=\s*/, "")
          .replace(/;$/, "");
        return JSON.parse(jsonContent);
      } catch (error) {
        throw new Error(`Failed to parse tweets file: ${error}`);
      }
    }
  };

  const tweet_to_bsky = async () => {
    // TODO: un comment this code
    if (!agent) {
      console.log("No agent found");
      return;
    }

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
      const sortedTweets = tweets
        .filter((tweet) => {
          const tweetDate = new Date(tweet.tweet.created_at);
          if (dateRange.min_date && tweetDate < dateRange.min_date)
            return false;
          if (dateRange.max_date && tweetDate > dateRange.max_date)
            return false;
          return true;
        })
        .sort((a, b) => {
          return (
            new Date(a.tweet.created_at).getTime() -
            new Date(b.tweet.created_at).getTime()
          );
        });

      for (const [index, { tweet }] of sortedTweets.entries()) {
        try {
          setProgress(Math.round((index / sortedTweets.length) * 100));
          const tweetDate = new Date(tweet.created_at);
          const tweet_createdAt = tweetDate.toISOString();

          if (
            tweet.in_reply_to_screen_name ||
            tweet.full_text.startsWith("@") ||
            tweet.full_text.startsWith("RT ")
          ) {
            continue;
          }

          let embeddedImage = [] as any;
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

                const mediaFilename = `data/tweets_media/${tweet.id}-${media.media_url.split("/").pop()}`;
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
                hasVideo = true;
                break;
              }
            }
          }

          if (hasVideo) continue;

          let postText = tweet.full_text;
          if (!simulate) {
            postText = await cleanTweetText(tweet.full_text);
            if (postText.length > 300) {
              postText = postText.substring(0, 296) + "...";
            }
          }

          const rt = new RichText({ text: postText });
          await rt.detectFacets(agent);

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

          if (!simulate) {
            await new Promise((resolve) => setTimeout(resolve, ApiDelay));
            const recordData = await agent.post(postRecord);
            const postRkey = recordData.uri.split("/").pop();
            if (postRkey) {
              const postUri = `https://bsky.app/profile/${BLUESKY_USERNAME}/post/${postRkey}`;
              console.log("Bluesky post created:", postUri);
              importedTweet++;
            }
          } else {
            importedTweet++;
          }
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
          Port Twitter posts to Bluesky
        </h1>
        <div className="mt-4">
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg shadow-lg tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue-600 hover:text-white"
          >
            <Upload className="w-8 h-8" />
            <span className="mt-2 text-base leading-normal">
              Select a folder
            </span>
            <input
              id="file-upload"
              type="file"
              onChange={(e) => setFiles(e.target.files)}
              className="hidden"
              {...({
                webkitdirectory: "true",
              } as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          </label>
        </div>
        {files && files.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {files.length} files selected
            </p>
            <div>
              <FileFoundCard
                cardName="tweets.js"
                found={CheckFile("tweets.js")}
              />
            </div>
            {isProcessing && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Processing... {progress}%
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center mt-2">
            Choose the folder containing your Twitter posts to import them into
            Bluesky.
          </div>
        )}
        <Button
          onClick={tweet_to_bsky}
          className="w-full mt-4"
          disabled={!files || files.length === 0 || isProcessing}
        >
          {isProcessing ? "Processing..." : "Import Posts"}
        </Button>
      </div>
    </div>
  );
};

export default Home;
