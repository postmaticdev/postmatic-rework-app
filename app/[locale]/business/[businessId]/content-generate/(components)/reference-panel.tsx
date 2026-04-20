"use client";

import { useContentGenerate } from "@/contexts/content-generate-context";
import { SharedReferencePanel } from "@/components/shared/shared-reference-panel";

export function ReferencePanel() {
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
  } = useContentGenerate();

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
      showSearchNotFound={true}
    />
  );
}
