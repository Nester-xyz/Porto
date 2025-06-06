import { useState } from "react";
import { initialShareableData } from "@/lib/constant";
import RenderStep1 from "./render1/render1";
import { shareableData } from "@/types/render";
import RenderStep2 from "./render2/render2";
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
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="border p-8 rounded-lg max-w-md w-full dark:bg-card dark:shadow-md">
        <div className="">
          <Steps currentStep={currentStep} />
        </div>

        {currentStep === 1 ? (
          <RenderStep1
            onAnalysisComplete={updateShareableData}
            setCurrentStep={setCurrentStep}
          />
        ) : currentStep === 2 ? (
          <RenderStep2
            shareableData={shareableData}
            setShareableData={setShareableData}
            setCurrentStep={setCurrentStep}
          />
        ) : (
          <RenderStep3
            shareableData={shareableData}
            setCurrentStep={setCurrentStep}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
