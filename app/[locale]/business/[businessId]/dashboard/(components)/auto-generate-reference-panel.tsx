"use client";

import { useAutoGenerate } from "@/contexts/auto-generate-context";
import { SharedReferencePanel } from "@/components/shared/shared-reference-panel";

export function AutoGenerateReferencePanel() {
  const { 
    publishedTemplates, 
    savedTemplates, 
    form,
    onSelectReferenceImage,
    onSaveUnsave,
    onConfirmUnsave,
    onCloseUnsaveModal,
    unsaveModal,
    isLoading,
    selectedTemplate
  } = useAutoGenerate();

  return (
    <SharedReferencePanel
      publishedTemplates={publishedTemplates}
      savedTemplates={savedTemplates}
      form={form}
      onSelectReferenceImage={onSelectReferenceImage}
      onSaveUnsave={onSaveUnsave}
      onConfirmUnsave={onConfirmUnsave}
      onCloseUnsaveModal={onCloseUnsaveModal}
      unsaveModal={unsaveModal}
      isLoading={isLoading}
      selectedTemplate={selectedTemplate}
      showSearchNotFound={false}
      onAutoGenerate={true}
    />
  );
}
