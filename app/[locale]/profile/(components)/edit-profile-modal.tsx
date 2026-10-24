"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, ArrowLeft, ArrowRight, Eye, EyeOff, Save } from "lucide-react";
import { UploadPhoto } from "@/components/forms/upload-photo";
import {
  useAuthProfileChangePassword,
  useAuthProfileGetProfile,
  useAuthProfileUpdateProfile,
} from "@/services/auth.api";
import { ProfilePld, UpdatePasswordPld } from "@/models/api/auth/profile.type";
import { showToast } from "@/helper/show-toast";
import { SearchableCountrySelect } from "./searchable-select-content";
import countryCodes from "@/lib/country-code.json";
import { FcGoogle } from "react-icons/fc";
import { useLocale, useTranslations } from "next-intl";
import { localizeCountryNames } from "@/helper/locale";
import { AxiosError } from "axios";

type ViewMode = "profile" | "password";

// Mirrors the API rule for PUT /account/profile/password (min=8, max=72).
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const PASSWORD_LENGTH_PARAMS = { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH };
// Mirrors the API rule for PUT /account/profile.
const DEFAULT_COUNTRY_CODE = "+62";
const DESCRIPTION_MAX_LENGTH = 255;
const PHONE_MAX_LENGTH = 20;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialFormData: ProfilePld = {
  countryCode: "",
  phone: "",
  image: null,
  email: "",
  name: "",
  description: "",
};

type UpdatePasswordData = UpdatePasswordPld & { confirmPassword: string };
const initialPasswordData: UpdatePasswordData = {
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const initialShowPasswords = {
  current: false,
  new: false,
  confirm: false,
};

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { data: profileData } = useAuthProfileGetProfile();
  const profile = profileData?.data?.data;
  const mUpdateProfile = useAuthProfileUpdateProfile();
  const mChangePassword = useAuthProfileChangePassword();

  // Akun Google tanpa password tidak bisa memakai "ganti password".
  const isSocialAccount =
    !!profile?.google?.isConnected && !profile?.credential?.isPasswordSet;

  const [formData, setFormData] = useState<ProfilePld>(initialFormData);
  const [passwordData, setPasswordData] =
    useState<UpdatePasswordData>(initialPasswordData);
  const [showPasswords, setShowPasswords] = useState(initialShowPasswords);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Isi ulang form dari profile setiap modal dibuka, supaya editan yang
  // dibatalkan tidak muncul lagi dan refetch tidak menimpa editan yang sedang berjalan.
  const isFormInitialized = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      isFormInitialized.current = false;
      return;
    }
    if (!profile || isFormInitialized.current) return;
    isFormInitialized.current = true;
    setFormData({
      // countryCode wajib di API (PUT /account/profile), default ke Indonesia.
      countryCode: profile.countryCode || DEFAULT_COUNTRY_CODE,
      phone: profile.phone || "",
      image: profile.image || null,
      email: profile.email || "",
      name: profile.name || "",
      description: profile.description || "",
    });
  }, [isOpen, profile]);

  const handleSaveProfile = async () => {
    if (!profile || mUpdateProfile.isPending || isUploadingPhoto) return;
    const name = formData.name.trim();
    if (!name) {
      showToast("error", t("profileErrors.nameRequired"));
      return;
    }
    try {
      let copiedPhone = formData.phone;
      let isStartWith0 = true;

      while (isStartWith0) {
        const firstChar = copiedPhone[0];
        if (firstChar !== "0") {
          isStartWith0 = false;
          break;
        }
        copiedPhone = copiedPhone.slice(1);
      }

      const res = await mUpdateProfile.mutateAsync({
        ...formData,
        name,
        countryCode: formData.countryCode || DEFAULT_COUNTRY_CODE,
        phone: copiedPhone,
      });
      showToast("success", res.data.responseMessage);
      onClose();
    } catch {}
  };

  const [currentView, setCurrentView] = useState<ViewMode>("profile");

  const handleInputChange = (field: keyof ProfilePld, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordChange = (
    field: keyof UpdatePasswordData,
    value: string
  ) => {
    setPasswordData((prev) => ({
      ...prev,
      [field as keyof UpdatePasswordData]: value,
    }));
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChangePassword = () => {
    setCurrentView("password");
  };

  const handleBackToProfile = () => {
    setCurrentView("profile");
    // Reset password form when going back
    setPasswordData({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    });
  };

  const newPasswordLength = passwordData.newPassword.length;
  const isNewPasswordLengthValid =
    newPasswordLength >= PASSWORD_MIN_LENGTH &&
    newPasswordLength <= PASSWORD_MAX_LENGTH;
  const isConfirmMismatch =
    passwordData.confirmPassword.length > 0 &&
    passwordData.confirmPassword !== passwordData.newPassword;

  const getChangePasswordErrorMessage = (error: unknown): unknown => {
    if (!(error instanceof AxiosError)) return error;
    const code = error.response?.data?.responseMessage;
    if (error.response?.status === 429 || code === "TOO_MANY_REQUESTS") {
      const retryAfter = Number(
        error.response?.data?.data?.retryAfter ??
          error.response?.headers?.["retry-after"]
      );
      return retryAfter > 0
        ? t("passwordErrors.tooManyRequestsRetry", {
            minutes: Math.ceil(retryAfter / 60),
          })
        : t("passwordErrors.tooManyRequests");
    }
    if (
      code === "ACCOUNT_USES_GOOGLE_SIGN_IN" ||
      code === "CREDENTIAL_USER_NOT_FOUND"
    ) {
      return t("passwordErrors.googleOnly");
    }
    if (code === "VALIDATION_FAILED") {
      return t("passwordErrors.newPasswordLength", PASSWORD_LENGTH_PARAMS);
    }
    return error;
  };

  const handlePasswordSave = async () => {
    if (!passwordData.oldPassword) {
      showToast("error", t("passwordErrors.oldPasswordRequired"));
      return;
    }
    if (!isNewPasswordLengthValid) {
      showToast(
        "error",
        t("passwordErrors.newPasswordLength", PASSWORD_LENGTH_PARAMS)
      );
      return;
    }
    if (passwordData.confirmPassword !== passwordData.newPassword) {
      showToast("error", t("passwordErrors.confirmMismatch"));
      return;
    }
    try {
      const res = await mChangePassword.mutateAsync(passwordData);
      showToast("success", res.data.responseMessage);
      onClose();
      setCurrentView("profile");
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });
    } catch (error) {
      showToast("error", getChangePasswordErrorMessage(error));
    }
  };

  const handleModalClose = () => {
    setCurrentView("profile");
    setPasswordData(initialPasswordData);
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    });
    onClose();
  };
 
  const t = useTranslations("editProfileModal");
  const locale = useLocale();
  const localizedCountries = useMemo(
    () => localizeCountryNames(countryCodes, locale),
    [locale]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent>
        {/* Header */}
        <DialogHeader>
          <div>
            <DialogTitle>
              {currentView === "profile" ? t("title") : t("titlePassword")}
            </DialogTitle>
            <DialogDescription>
              {currentView === "profile"
                ? t("subtitle")
                : t("subtitlePassword")}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
          {currentView === "profile" ? (
            <>
              {/* Profile Image */}
              <div className="flex justify-center">
                <UploadPhoto
                  label={t("profilePhoto")}
                  onImageChange={(image: string | null) => {
                    setFormData((prev) => ({
                      ...prev,
                      image: image,
                    }));
                  }}
                  currentImage={formData.image}
                  onUploadingChange={setIsUploadingPhoto}
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("name")}</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-card"
                  placeholder={t("namePlaceholder")}
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("bio")}</label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="bg-card min-h-24 resize-none"
                  placeholder={t("bioPlaceholder")}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("email")}</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-card"
 
                  disabled
                />
              </div>

              {/* Phone with Country Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("phone")}</label>
                <div className="flex space-x-2">
                  <SearchableCountrySelect
                    countries={localizedCountries}
                    value={formData.countryCode}
                    onValueChange={(value) =>
                      handleInputChange("countryCode", value)
                    }
                    placeholder={t("countryCode")}
                    searchPlaceholder={t("countryCodeSearch")}
                    className="w-28 sm:w-40 bg-card"
                  />
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    maxLength={PHONE_MAX_LENGTH}
                    onChange={(e) =>
                      handleInputChange("phone", e.target.value.replace(/\D/g, ""))
                    }
                    className="bg-card flex-1"
                    placeholder={t("phonePlaceholder")}
                  />
                </div>
              </div>

              {/* Change Password Button */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isSocialAccount ? t("account") : t("password")}
                </label>
                {isSocialAccount ? (
                  <Button
                    variant="outline"
                    className="w-full justify-between space-x-3 bg-card text-foreground hover:bg-background"
                  >
                    <div className="flex items-center space-x-3">
                      <FcGoogle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {t("connectedGoogle")}
                      </span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-between space-x-3 bg-card text-muted-foreground hover:bg-background"
                    onClick={handleChangePassword}
                  >
                    <div className="flex items-center space-x-3">
                      <Lock className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {t("changePassword")}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Current Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("oldPassword")}</label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.oldPassword}
                    onChange={(e) =>
                      handlePasswordChange("oldPassword", e.target.value)
                    }
                    className="bg-card pr-10"
                    placeholder={t("oldPasswordPlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("current")}
                    aria-label={showPasswords.current ? t("hidePassword") : t("showPassword")}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("newPassword")}</label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      handlePasswordChange("newPassword", e.target.value)
                    }
                    className="bg-card pr-10"
                    placeholder={t("newPasswordPlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("new")}
                    aria-label={showPasswords.new ? t("hidePassword") : t("showPassword")}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p
                  className={`text-xs ${
                    newPasswordLength > 0 && !isNewPasswordLengthValid
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {t("passwordHint", PASSWORD_LENGTH_PARAMS)}
                </p>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("confirmPassword")}
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      handlePasswordChange("confirmPassword", e.target.value)
                    }
                    className="bg-card pr-10"
                    placeholder={t("confirmPasswordPlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("confirm")}
                    aria-label={showPasswords.confirm ? t("hidePassword") : t("showPassword")}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {isConfirmMismatch && (
                  <p className="text-xs text-destructive">
                    {t("passwordErrors.confirmMismatch")}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {currentView === "password" && (
            <Button
              variant="outline"
              onClick={handleBackToProfile}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("back")}</span>
            </Button>
          )}
          <Button
            onClick={
              currentView === "profile"
                ? handleSaveProfile
                : handlePasswordSave
            }
            disabled={
              currentView === "password"
                ? mChangePassword.isPending
                : mUpdateProfile.isPending || isUploadingPhoto
            }
          >
            <Save className="h-4 w-4" />
            <span>
              {currentView === "profile"
                ? t("save")
                : t("savePassword")}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
