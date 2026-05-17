/* payload for disconnect platform */
export interface PlatformPld {
  platform: string;
}

/* response for get platform */
export interface PlatformRes {
  name: string;
  platform: PlatformEnum;
  image: string;
  status: "connected" | "unconnected" | "unavailable";
  accountDisplayName: string | null;
  accountDisplayImage: string | null;
  connectUrl: string | null;
  disconnectUrl: string | null;
  accountId: string | null;
}

export interface ConnectedPlatformSocialPlatformApiRes {
  id: number;
  platformCode: PlatformEnum;
  logo: string;
  name: string;
  hint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedPlatformApiRes {
  id: number;
  businessRootId: number;
  platformCode: PlatformEnum;
  platformName: string;
  platformId: number;
  platformIsActive: boolean;
  platformUserId: string;
  platformIconUrl: string | null;
  platformUserName: string | null;
  platformUserEmail: string | null;
  platformScopes: string[];
  platformTokenExpiredAt: string | null;
  platformMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessConnectedPlatformApiRes {
  socialPlatform: ConnectedPlatformSocialPlatformApiRes;
  connectedPlatform: ConnectedPlatformApiRes | null;
}

export interface ConnectedPlatformAuthorizeUrlRes {
  authUrl: string;
}

export interface PendingConnectedPlatformAccountRes {
  tempCodeAccount: string;
  platformUserId: string;
  platformUserName: string | null;
  platformUserEmail: string | null;
  platformIconUrl: string | null;
  platformScopes: string[];
}

export interface PendingConnectedPlatformOauthRes {
  tempCode: string;
  platformCode: PlatformEnum;
  selectionRequired: boolean;
  accounts: PendingConnectedPlatformAccountRes[];
}

export interface ConnectPlatformAccountRes {
  selectionRequired: boolean;
  connectedPlatform: ConnectedPlatformApiRes | null;
  selectableAccounts: PendingConnectedPlatformAccountRes[];
}

export type PlatformEnum =
  | "linked_in"
  | "facebook_page"
  | "instagram_business"
  | "whatsapp_business"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "pinterest";
