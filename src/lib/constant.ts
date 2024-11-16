export const ApiDelay = 2500;
export const BLUESKY_USERNAME = localStorage.getItem("handle")?.split(".")[0];

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
  min_date: new Date(80, 0, 1),
  max_date: new Date(),
};

export const initialShareableData = {
  fileMap: new Map<string, File>(),
  totalTweets: 0,
  validTweets: 0,
  tweetsLocation: "",
  mediaLocation: "",
  dateRange: intialDate,
};
