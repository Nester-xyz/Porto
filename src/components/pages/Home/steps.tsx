import React from "react";
import { UploadCloud, Check, Settings, PartyPopper } from "lucide-react";

type StepProps = {
  step: number;
  currentStep: number;
  title: string;
  icon: React.ReactNode;
};

const Step = ({ step, currentStep, title, icon }: StepProps) => {
  const isActive = currentStep === step;
  const isCompleted = currentStep > step;

  return (
    <div className="flex items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
          isCompleted
            ? "bg-green-500 text-white"
            : isActive
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        }`}
      >
        {isCompleted ? <Check className="w-6 h-6" /> : icon}
      </div>
      <div className="ml-4">
        <div
          className={`text-sm font-medium ${
            isActive || isCompleted
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {title}
        </div>
      </div>
    </div>
  );
};

const Steps = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    {
      step: 1,
      title: "Upload",
      icon: <UploadCloud className="w-6 h-6" />,
    },
    {
      step: 2,
      title: "Customize",
      icon: <Settings className="w-6 h-6" />,
    },
    { step: 3, title: "Finish", icon: <PartyPopper className="w-6 h-6" /> },
  ];

  return (
    <div className="flex items-center justify-between w-full mb-8">
      {steps.map((s, index) => (
        <React.Fragment key={s.step}>
          <Step
            step={s.step}
            currentStep={currentStep}
            title={s.title}
            icon={s.icon}
          />
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 mx-4 rounded-full ${
                currentStep > s.step
                  ? "bg-green-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Steps;
