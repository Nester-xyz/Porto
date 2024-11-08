import { useState } from "react";
import { SiTicktick } from "react-icons/si";
import { initialShareableData } from "@/lib/constant";
import RenderStep1 from "./render1";
import { shareableData } from "@/types/render";
import RenderStep2 from "./render2";
import RenderStep3 from "./render3";

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
          <div className="flex items-center justify-center mb-4">
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
          </div>
          <h1 className="text-2xl font-bold text-center text-blue-600">
            Port Twitter posts to Bluesky
          </h1>
        </div>

        {currentStep === 1 ? (
          <RenderStep1 onAnalysisComplete={updateShareableData} />
        ) : currentStep === 2 ? (
          <RenderStep2 shareableData={shareableData} />
        ) : (
          <RenderStep3
            totalTweets={shareableData.totalTweets}
            validTweets={shareableData.validTweets}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
