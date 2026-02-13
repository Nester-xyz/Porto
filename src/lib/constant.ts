import { TDateRange, TFileState } from "@/types/render";

export const ApiDelay = 2500;
export const TWEETS_FILENAME = "tweets.js";
export const TWEETS_MEDIA_FOLDER = "tweets_media";

export const getBlueskyProfileUrl = () => {
  const handle = localStorage.getItem("handle");
  if (!handle) return "https://bsky.app";
  return `https://bsky.app/profile/${handle}`;
};

export const initialFileState: TFileState = {
  files: null,
  tweetsLocation: null,
  mediaLocation: null,
  fileMap: new Map(),
};

export const initalTweetAnalyzer = {
  isAnalyzing: false,
  totalTweets: 0,
  validTweets: 0,
};

export const intialDate: TDateRange = {
  min_date: new Date(2000, 0, 1),
  max_date: new Date(),
};

export const initialShareableData = {
  fileMap: new Map<string, File>(),
  totalTweets: 0,
  validTweets: 0,
  tweetsLocation: "",
  mediaLocation: "",
  dateRange: intialDate,
  validTweetsData: [],
  selectedTweetIds: [],
};
