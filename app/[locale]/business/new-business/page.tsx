"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BusinessKnowledge } from "@/app/[locale]/business/new-business/(components)/business-knowledge";
import { ProductKnowledge } from "@/app/[locale]/business/new-business/(components)/product-knowledge";
import { RoleKnowledge } from "@/app/[locale]/business/new-business/(components)/role-knowledge";
import { Progress } from "@/components/ui/progress";
import { useFormNewBusiness } from "@/contexts/form-new-business-context";
import { showToast } from "@/helper/show-toast";
import { useBusinessCreate } from "@/services/business.api";

import { useBusinessKnowledgeSchema, useProductKnowledgeSchema, useRoleKnowledgeSchema } from "@/validator/new-business/schema-with-i18n";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";



export default function NewBusiness() {
  const t = useTranslations("newBusiness");
  const businessKnowledgeSchema = useBusinessKnowledgeSchema();
  const productKnowledgeSchema = useProductKnowledgeSchema();
  const roleKnowledgeSchema = useRoleKnowledgeSchema(); 

const steps = [
  {
    id: 1,
    title: t("title1"),
    component: BusinessKnowledge,
    backgroundImage: "/businessknowledge.PNG",
  },
  {
    id: 2,
    title: t("title2"),
    component: ProductKnowledge,
    backgroundImage: "/productknowledge.PNG",
  },
  {
    id: 3,
    title: t("title3"),
    component: RoleKnowledge,
    backgroundImage: "/roleknowledge.PNG",
  },
];

  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const { formData, setBusinessId, errors, setErrors } = useFormNewBusiness();
  const { step1, step2, step3 } = formData;

  const mBusiness = useBusinessCreate();

  const isLoading = mBusiness.isPending;

  const onSubmit = async () => {
    try {
      if (isLoading) {
        throw new Error(t("isLoading"));
      }

      const business = await mBusiness.mutateAsync({
        businessKnowledge: step1,
        productKnowledge: step2,
        roleKnowledge: step3,
      });

      setBusinessId(business.data.data.id);

      const id = business.data.data.id;

      router.push(`/business/${id}/pricing?isNewBusiness=true`);
    } catch (error) {
      console.log(error);
      showToast("error", error);
    }
  };

  const currentStepData = steps[currentStep];
  const CurrentComponent = currentStepData.component;

  const validateStep = () => {
    const validationErrors = { ...errors };

    if (currentStep === 0) {
      const result = businessKnowledgeSchema.safeParse(step1);
      if (!result.success) {
        const step1Errors: Record<string, string> = {};
        result.error.issues.forEach((error) => {
          step1Errors[error.path[0] as string] = error.message;
        });
        validationErrors.step1 = step1Errors;
        setErrors(validationErrors);
        throw new Error(t("validateBusinessKnowledge"));
      } else {
        validationErrors.step1 = {};
      }
    }

    if (currentStep === 1) {
      const result = productKnowledgeSchema.safeParse(step2);
      if (!result.success) {
        const step2Errors: Record<string, string> = {};
        result.error.issues.forEach((error) => {
          step2Errors[error.path[0] as string] = error.message;
        });
        validationErrors.step2 = step2Errors;
        console.log(validationErrors);
        setErrors(validationErrors);
        throw new Error(t("validateProductKnowledge"));
      } else {
        validationErrors.step2 = {};
      }
    }

    if (currentStep === 2) {
      const result = roleKnowledgeSchema.safeParse(step3);
      if (!result.success) {
        const step3Errors: Record<string, string> = {};
        result.error.issues.forEach((error) => {
          step3Errors[error.path[0] as string] = error.message;
        });
        validationErrors.step3 = step3Errors;
        setErrors(validationErrors);
        throw new Error(t("validateRoleKnowledge"));
      } else {
        validationErrors.step3 = {};
      }
    }

    setErrors(validationErrors);
  };

  const handleNext = () => {
    try {
      validateStep();
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        onSubmit();
      }
    } catch (error) {
      showToast("error", error);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-transparent rounded overflow-hidden flex">
      {/* Left Panel */}
      <div className="flex flex-col w-full md:w-2/3 lg:w-2/5  mx-auto mb-22 mt-18 md:mt-22">
        {/* Header */}
        <div className=" p-2 md:p-4 bg-background dark:bg-card border-b border-border fixed top-0 left-0 right-0 z-50 w-full md:w-2/3 lg:w-2/5">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="cursor-pointer">
              <Image
                src="/logoblue.png"
                alt="logol"
                width={200}
                height={200}
                className="w-12 h-12"
              />
            </Link>
            <h1 className="text-xl font-bold">{currentStepData.title}</h1>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className=" flex-1 bg-card dark:bg-background p-6 overflow-y-auto">
          <CurrentComponent />
        </div>

        {/* Footer */}
        <div className="bg-background dark:bg-card p-6 border-t border-border rounded-b-lg fixed bottom-0 left-0 right-0 z-50 w-full md:w-2/3 lg:w-2/5">
          <div className="flex justify-between items-center gap-4 mt-2">
            <Progress value={currentStep * 50} />
            <div className="flex flex-row gap-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                {t("previous")}
              </Button>
              <Button
                onClick={handleNext}
                className="bg-primary text-white hover:bg-blue-700 "
                disabled={isLoading}
              >
                {isLoading
                  ? t("loading")
                  : currentStep === steps.length - 1
                  ? t("submit")
                  : t("next")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Background Image (Hidden on Mobile) */}
      <div className="hidden md:block flex-1 relative">
        <Image
          src={currentStepData.backgroundImage}
          alt={`${currentStepData.title} Background`}
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
