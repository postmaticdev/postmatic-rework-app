"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
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
import { useTranslations } from "next-intl";

type ViewMode = "profile" | "password";

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

  const isSocialAccount = profile?.users?.some(
    (user) => user.provider === "google"
  );

  const [formData, setFormData] = useState<ProfilePld>(initialFormData);
  const [passwordData, setPasswordData] =
    useState<UpdatePasswordData>(initialPasswordData);
  const [showPasswords, setShowPasswords] = useState(initialShowPasswords);
  useEffect(() => {
    if (profile) {
      setFormData({
        countryCode: profile.countryCode || "",
        phone: profile.phone || "",
        image: profile.image || null,
        email: profile.email || "",
        name: profile.name || "",
        description: profile.description || "",
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      if (!profile) return;
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

  const handlePasswordSave = async () => {
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
    } catch {}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    countries={countryCodes}
                    value={formData.countryCode}
                    onValueChange={(value) =>
                      handleInputChange("countryCode", value)
                    }
                    placeholder={t("countryCode")}
                    searchPlaceholder={t("countryCodeSearch")}
                    className="w-40 bg-card"
                  />
                  <Input
                    type="number"
                    value={formData.phone}
                    onKeyDown={(evt) =>
                      ["e", "E", "+", "-"].includes(evt.key) &&
                      evt.preventDefault()
                    }
                    onChange={(e) => handleInputChange("phone", e.target.value)}
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
                    className="w-full h-12 justify-between space-x-3 bg-card text-foreground hover:bg-background"
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
                    className="w-full h-12 justify-between space-x-3 bg-card text-muted-foreground hover:bg-background"
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
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
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
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-6 pt-4 border-t border-border">
          {currentView === "password" && (
            <Button
              variant="outline"
              onClick={handleBackToProfile}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("back")}</span>
            </Button>
          )}
          <div className={currentView === "password" ? "ml-auto" : "w-full"}>
            <Button
              onClick={
                currentView === "profile"
                  ? handleSaveProfile
                  : handlePasswordSave
              }
              className="w-full flex items-center justify-center space-x-2"
            >
              <span>
                {currentView === "profile"
                  ? t("save")
                  : "Ubah Password"}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
