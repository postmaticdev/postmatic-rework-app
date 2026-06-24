export interface BusinessAvatarPld {
  name: string;
  imageUrl: string;
}

export interface BusinessAvatarRes {
  id: string;
  name: string;
  imageUrl: string;
  appAvatarId: string | null;
  rootBusinessId: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BusinessAvatarDeleteRes = BusinessAvatarRes;
