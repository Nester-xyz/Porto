const UploadedPost = ({
  postName,
  link,
}: {
  postName: string;
  link: string;
}) => {
  return (
    <div className="bg-card shadow-md rounded-lg p-4 w-80 border border-border">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{postName}</h2>
        </div>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
        >
          View Post
        </a>
      </div>
    </div>
  );
};

export default UploadedPost;
