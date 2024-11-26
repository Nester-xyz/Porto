export const ApiDelay = 2500;
export const BLUESKY_USERNAME = localStorage.getItem("handle")?.split(".")[0];
export const TWEETS_FILENAME = "tweets.js";
export const TWEETS_MEDIA_FOLDER = "tweets_media";

export const initialFileState = {
  files: null as FileList | null,
  fileMap: new Map<string, File>(),
  tweetsLocation: null as string | null,
  mediaLocation: null as string | null,
};

export const initalTweetAnalyzer = {
  isAnalyzing: false,
  totalTweets: 0,
  validTweets: 0,
};

export const intialDate = {
  min_date: new Date(2023, 11, 23),
  max_date: new Date(2023, 11, 25),
};

export const initialShareableData = {
  fileMap: new Map<string, File>(),
  totalTweets: 0,
  validTweets: 0,
  tweetsLocation: "",
  mediaLocation: "",
  dateRange: intialDate,
};
