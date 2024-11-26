import { processTweetsData } from "@/lib/parse/processTweets";
import { TDateRange, TFileState } from "@/types/render";
import { Tweet } from "@/types/tweets";
import { useCallback, useEffect, useState } from "react";

export const useAnalysis = (fileState: TFileState, dateRange: TDateRange) => {
  const [analysisProgress, setAnalysisProgress] = useState(false);
  const [tweetsFile, setTweetsFile] = useState<File>();
  const [tweets, setTweets] = useState<Tweet[]>();
  const [validTweets, setValidTweets] = useState<Tweet[]>();

  const checkFile = useCallback(() => {
    if (!fileState.tweetsLocation) return null;
    const tweetsFile = fileState.fileMap.get(fileState.tweetsLocation!);
    if (!tweetsFile)
      throw new Error(`Tweets file not found at ${fileState.tweetsLocation}`);
    setTweetsFile(tweetsFile);
  }, [fileState]);

  const analyzeTweets = useCallback(async () => {
    if (!tweetsFile) return null;

    setAnalysisProgress(true);
    const { tweets, validTweets } = await processTweetsData(
      tweetsFile,
      dateRange,
    );
    setTweets(tweets);
    setValidTweets(validTweets);

    setAnalysisProgress(false);
  }, [dateRange, tweetsFile]);

  useEffect(() => {
    checkFile();
    analyzeTweets();
  }, [checkFile, analyzeTweets]);

  return {
    analysisProgress,
    tweets,
    validTweets,
  };
};
