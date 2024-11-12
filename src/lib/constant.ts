export const ApiDelay = 2500;
export const BLUESKY_USERNAME = localStorage.getItem("handle");

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
  min_date: undefined,  // "Fri Feb 17 13:05:37 +0000 2023",
  max_date: undefined  // "Sat Feb 18 13:05:37 +0000 2023",
};

export const initialShareableData = {
  fileMap: new Map<string, File>(),
  totalTweets: 0,
  validTweets: 0,
  tweetsLocation: "",
  mediaLocation: "",
  dateRange: intialDate,
};
