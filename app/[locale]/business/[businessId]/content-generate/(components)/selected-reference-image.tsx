import { useContentGenerate } from "@/contexts/content-generate-context";
import { SharedSelectedReferenceImage } from "@/components/shared/shared-selected-reference-image";

export const SelectedReferenceImage = () => {
  const { form, selectedHistory, isLoading, setSelectedTemplate } = useContentGenerate();
  
  const imageHistory =
    selectedHistory?.result?.images[0] ||
    selectedHistory?.input?.referenceImage;

  // Don't show if no reference image or if it's the same as history image
  if (
    !form?.basic?.referenceImage ||
    form.basic.referenceImage === imageHistory
  )
    return null;

  return (
    <SharedSelectedReferenceImage
      referenceImage={form.basic.referenceImage}
      referenceImageName={form.basic.referenceImageName}
      referenceImagePublisher={form.basic.referenceImagePublisher}
      onRemove={() => {
        form.setBasic({
          ...form.basic,
          referenceImage: null,
          referenceImageName: null,
          referenceImagePublisher: null,
        });
        setSelectedTemplate(null);
      }}
      isLoading={isLoading}
      idSelector="selected-reference-image"
    />
  );
};
