import { useAutoGenerate } from "@/contexts/auto-generate-context";
import { SharedSelectedReferenceImage } from "@/components/shared/shared-selected-reference-image";

export const AutoSelectedReferenceImage = () => {
  const { form, isLoading, setSelectedTemplate } = useAutoGenerate();

  if (!form?.basic?.referenceImage) return null;

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
      idSelector="auto-selected-reference-image"
    />
  );
};
