"use client";

import { useContentGenerate } from "@/contexts/content-generate-context";
import { SharedReferencePanel } from "@/components/shared/shared-reference-panel";

export function ReferencePanel() {
  const {
    publishedTemplates,
    savedTemplates,
    onSelectReferenceImage,
    onSaveUnsave,
    onSaveUploadedReference,
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
      onSelectReferenceImage={onSelectReferenceImage}
      onSaveUploadedReference={onSaveUploadedReference}
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
