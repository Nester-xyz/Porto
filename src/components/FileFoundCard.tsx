const FileFoundCard = ({
  cardName,
  found,
}: {
  cardName: string;
  found: boolean;
}) => {
  return (
    <div
      className={`${
        found
          ? "bg-green-100 border-green-400 text-green-700"
          : "bg-red-100 border-red-400 text-red-700"
      } border rounded-lg p-4 w-64 shadow-lg flex items-center justify-between`}
    >
      <div>
        <p className="font-bold">{cardName}</p>
        <p className="text-sm">
          {found ? "was successfully loaded" : "could not be found"}
        </p>
      </div>
      <div
        className={`text-lg font-bold ${found ? "text-green-600" : "text-red-600"}`}
      >
        {found ? "✔" : "✖"}
      </div>
    </div>
  );
};
export default FileFoundCard;
