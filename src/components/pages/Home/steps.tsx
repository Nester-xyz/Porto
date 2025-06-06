import { SiTicktick } from "react-icons/si";

const Steps = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="flex items-center justify-center mb-4">
      <div className="flex items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 1
              ? "bg-blue-600 text-white dark:bg-blue-500"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          1
        </div>
        <div
          className={`w-16 h-1 ${
            currentStep >= 2
              ? "bg-blue-600 dark:bg-blue-500"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 2
              ? "bg-blue-600 text-white dark:bg-blue-500"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          2
        </div>
        <div
          className={`w-16 h-1 ${
            currentStep === 3
              ? "bg-blue-600 dark:bg-blue-500"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 3
              ? "bg-green-600 text-white dark:bg-green-500"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <SiTicktick />
        </div>
      </div>
    </div>
  );
};

export default Steps;
