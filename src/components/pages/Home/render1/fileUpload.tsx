import { Upload } from "lucide-react";

type FileUploadProps = {
  handleFileUpload: (files: FileList | null) => void;
};

const FileUpload = ({ handleFileUpload }: FileUploadProps) => {
  return (
    <div>
      <label
        htmlFor="file-upload"
        className="flex flex-col items-center px-4 py-6 bg-card text-blue-700 dark:text-blue-400 rounded-lg shadow-lg tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue-600 hover:text-white"
      >
        <Upload className="w-8 h-8" />
        <span className="mt-2 text-base leading-normal">Select a folder</span>
        <input
          id="file-upload"
          type="file"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          {...({
            webkitdirectory: "true",
          } as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      </label>
    </div>
  );
};

export default FileUpload;
