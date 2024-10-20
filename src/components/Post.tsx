import React, { useEffect } from "react";
import { Upload } from "lucide-react";

export default function Post() {
  const [files, setFiles] = React.useState<FileList | null>(null);
  useEffect(() => {
    console.log(files);
  }, [files])
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
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
              onChange={(e) => {
                setFiles(e.target.files);
              }}
              className="hidden"
              {...({
                webkitdirectory: "true",
              } as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          </label>
        </div>
        <p className="mt-4 text-sm text-gray-600 text-center">
          Choose the folder containing your Twitter posts to import them into
          Bluesky.
        </p>
      </div>
    </div>
  );
}
