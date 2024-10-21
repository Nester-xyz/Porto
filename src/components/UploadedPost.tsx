const UploadedPost = ({
  postName,
  link,
}: {
  postName: string;
  link: string;
}) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4 w-80 border border-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{postName}</h2>
        </div>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 text-sm font-medium"
        >
          View Post
        </a>
      </div>
    </div>
  );
};

export default UploadedPost;
