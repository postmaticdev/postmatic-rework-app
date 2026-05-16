export interface AiModelRes {
  id?: string;
  name: string;
  label?: string;
  description: string;
  provider?: string;
  image?: string | null;
  isActive?: boolean;
  validRatios: string[];
  imageSizes?: string[] | null;
}
