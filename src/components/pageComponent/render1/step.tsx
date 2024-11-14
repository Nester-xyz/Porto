import { SiTicktick } from "react-icons/si";

type StepProps = {
  currentStep: number;
};

const Step = ({ currentStep }: StepProps) => {
  return (
    <div className="flex items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"
        }`}
      >
        1
      </div>
      <div
        className={`w-16 h-1 ${
          currentStep >= 2 ? "bg-blue-600" : "bg-gray-200"
        }`}
      />
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"
        }`}
      >
        2
      </div>
      <div
        className={`w-16 h-1 ${
          currentStep === 3 ? "bg-blue-600" : "bg-gray-200"
        }`}
      />
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          currentStep === 3 ? "bg-green-600 text-white" : "bg-gray-200"
        }`}
      >
        <SiTicktick />
      </div>
    </div>
  );
};

export default Step;
