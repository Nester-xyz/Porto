import { TFileState } from "@/types/render";
import { useCallback, useEffect, useState } from "react";
import { findFileFromMap } from "@/lib/parse/parse";

export const useFileUpload = (initialFileState: TFileState) => {
  const [fileState, setFileState] = useState<TFileState>(initialFileState);
  const [targetFileFound, setTargetFileFound] = useState(false);

  const onFilesChange = useCallback(
    (files: File[]) => {
      if (!files || files.length === 0) {
        setFileState(initialFileState);
        return;
      }
      setFileState((prev) => ({
        ...prev,
        files: files,
        fileMap: new Map(
          files.map((file) => [
            (file as any).webkitRelativePath || file.name,
            file,
          ])
        ),
      }));
    },
    [initialFileState]
  );

  const findFile = useCallback(
    (fileName: string) => {
      return findFileFromMap(fileState.fileMap, fileName);
    },
    [fileState.fileMap]
  );

  useEffect(() => {
    if (!fileState.fileMap.size) {
      setTargetFileFound(false);
      return;
    }

    const tweetsFile = findFile("tweets.js");
    const accountFile = findFile("account.js");

    if (!accountFile) {
    }

    if (tweetsFile) {
      const parentFolder = (tweetsFile as any).webkitRelativePath
        .split("/")
        .slice(0, -1)
        .join("/");

      setFileState((prev) => ({
        ...prev,
        tweetsLocation: (tweetsFile as any).webkitRelativePath,
        mediaLocation: `${parentFolder}/tweets_media`,
      }));
      setTargetFileFound(true);
    } else {
      setTargetFileFound(false);
    }
  }, [fileState.fileMap, findFile, initialFileState]);

  return {
    fileState,
    onFilesChange,
    targetFileFound,
    setTargetFileFound,
    findFile,
    setFileState,
  };
};
