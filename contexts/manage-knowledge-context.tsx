"use client";

import {
  normalizeBusinessKnowledge,
  normalizeRoleKnowledge,
} from "@/helper/knowledge-form";
import { BusinessKnowledgePld } from "@/models/api/knowledge/business.type";
import { RoleKnowledgePld } from "@/models/api/knowledge/role.type";
import {
  useState,
  createContext,
  useContext,
  Dispatch,
  SetStateAction,
} from "react";

interface FormKnowledge {
  business: BusinessKnowledgePld;
  role: RoleKnowledgePld;
}

interface ValidationErrors {
  business: Record<string, string>;
  role: Record<string, string>;
}

const initialFormKnowledge: FormKnowledge = {
  business: normalizeBusinessKnowledge(),
  role: normalizeRoleKnowledge(),
};

interface ManageKnowledgeContext {
  formKnowledge: FormKnowledge;
  setFormKnowledge: Dispatch<SetStateAction<FormKnowledge>>;
  errors: ValidationErrors;
  setErrors: (errors: ValidationErrors) => void;
}

const ManageKnowledgeContext = createContext<
  ManageKnowledgeContext | undefined
>(undefined);

// Only holds the edit-knowledge form state. It sits in the root layout, so it
// must not fetch anything itself: that would add requests to every page.
export function ManageKnowledgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [formKnowledge, setFormKnowledge] =
    useState<FormKnowledge>(initialFormKnowledge);
  const [errors, setErrors] = useState<ValidationErrors>({
    business: {},
    role: {},
  });

  return (
    <ManageKnowledgeContext.Provider
      value={{ formKnowledge, setFormKnowledge, errors, setErrors }}
    >
      {children}
    </ManageKnowledgeContext.Provider>
  );
}

export const useManageKnowledge = () => {
  const context = useContext(ManageKnowledgeContext);
  if (context === undefined) {
    throw new Error(
      "useManageKnowledge must be used within a ManageKnowledgeProvider"
    );
  }
  return context;
};
