import { useState } from "react";
import { initialShareableData } from "@/lib/constant";
import RenderStep1 from "./render1";
import { shareableData } from "@/types/render";
import RenderStep2 from "./render2";
import RenderStep3 from "./render3";
import Steps from "./steps";

const Home = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [shareableData, setShareableData] =
    useState<shareableData>(initialShareableData);

  const updateShareableData = (data: shareableData) => {
    setShareableData(data);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="mb-8">
          <Steps currentStep={currentStep} />
          <h1 className="text-2xl font-bold text-center text-blue-600">
            Import Twitter posts to Bluesky
          </h1>
        </div>

        {currentStep === 1 ? (
          <RenderStep1
            onAnalysisComplete={updateShareableData}
            setCurrentStep={setCurrentStep}
          />
        ) : currentStep === 2 ? (
          <RenderStep2
            shareableData={shareableData}
            setCurrentStep={setCurrentStep}
          />
        ) : (
          <RenderStep3
            totalTweets={shareableData.totalTweets}
            validTweets={shareableData.validTweets}
            setCurrentStep={setCurrentStep}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
