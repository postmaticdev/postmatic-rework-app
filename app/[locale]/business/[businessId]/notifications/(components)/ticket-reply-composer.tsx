"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import LinkExtension from "@tiptap/extension-link";
import OrderedList from "@tiptap/extension-ordered-list";
import {
  ImagePlus,
  Send,
  X,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { NotificationAttachment } from "@/contexts/notification-context";
import { showToast } from "@/helper/show-toast";
import { cn } from "@/lib/utils";
import { helperService, validateUploadImageFile } from "@/services/helper.api";
import { isEmptyRichText } from "./rich-text-utils";

type ComposerAttachment = {
  type: "photo";
  name: string;
  url?: string;
  assetId?: number;
  preview: string;
};

const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: "1",
        parseHTML: (element) => element.getAttribute("type"),
        renderHTML: (attributes) => ({
          type: attributes.type,
        }),
      },
    };
  },
});

interface TicketReplyComposerProps {
  onSend: (body: string, attachments: NotificationAttachment[]) => void;
}

/**
 * Rich reply editor for a ticket. Mounted with `key={ticketId}` so switching
 * tickets resets the draft; loaded lazily so Tiptap is not part of the page bundle.
 */
export default function TicketReplyComposer({ onSend }: TicketReplyComposerProps) {
  const t = useTranslations("notifications");
  const [editorHtml, setEditorHtml] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        orderedList: false,
      }),
      CustomOrderedList,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setEditorHtml(editor.getHTML());
    },
  });

  // Bebaskan object URL preview saat composer dilepas (ganti tiket / pindah tab).
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((attachment) =>
        URL.revokeObjectURL(attachment.preview)
      );
    };
  }, []);

  const hasText = !isEmptyRichText(editorHtml);
  const canSendReply = hasText && !isUploadingAttachment;

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSendReply) return;

    onSend(
      editorHtml,
      attachments.map(({ type, name, url, assetId }) => ({ type, name, url, assetId }))
    );

    setEditorHtml("");
    editor?.commands.clearContent();
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.preview));
    setAttachments([]);
  };

  const handleLink = () => {
    const previousUrl = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("enterUrl"), previousUrl ?? "https://");

    if (url === null) return;
    if (!url.trim()) {
      editor?.chain().focus().unsetLink().run();
      return;
    }

    editor?.chain().focus().setLink({ href: url.trim() }).run();
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (files.length > imageFiles.length) {
      showToast("warning", t("imageAttachmentsOnly"));
    }

    // Samakan dengan aturan backend asset uploader (jpeg/png/webp, maks 10MB).
    const validFiles = imageFiles.filter((file) => !validateUploadImageFile(file));
    if (validFiles.length < imageFiles.length) {
      showToast("warning", t("imageAttachmentInvalid"));
    }

    if (validFiles.length === 0) return;

    const uploadingAttachments: ComposerAttachment[] = validFiles.map((file) => ({
      type: "photo",
      name: file.name,
      preview: URL.createObjectURL(file),
    }));

    setAttachments((prev) => [...prev, ...uploadingAttachments]);
    setIsUploadingAttachment(true);

    const results = await Promise.allSettled(
      validFiles.map((file) => helperService.uploadImageAsset({ image: file }))
    );

    const failedPreviews = new Set<string>();
    let failure: unknown = null;
    for (const [index, result] of results.entries()) {
      const preview = uploadingAttachments[index].preview;
      if (result.status === "fulfilled" && result.value.id !== null) continue;
      failedPreviews.add(preview);
      failure = result.status === "rejected" ? result.reason : t("imageAttachmentInvalid");
      URL.revokeObjectURL(preview);
    }

    setAttachments((prev) =>
      prev
        .filter((attachment) => !failedPreviews.has(attachment.preview))
        .map((attachment) => {
          const index = uploadingAttachments.findIndex(
            (uploading) => uploading.preview === attachment.preview
          );
          const result = index >= 0 ? results[index] : null;
          if (!result || result.status !== "fulfilled" || result.value.id === null) {
            return attachment;
          }
          return { ...attachment, url: result.value.url, assetId: result.value.id };
        })
    );
    setIsUploadingAttachment(false);
    if (failure) showToast("error", failure);
  }, [t]);

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toolbarButtonClass = (active?: boolean) =>
    cn(
      "h-(--control-h-icon-sm) shrink-0 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      active && "bg-accent text-accent-foreground"
    );
  const toolbarIconClass = (active?: boolean) =>
    cn(
      "shrink-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      active && "bg-accent text-accent-foreground"
    );

  return (
    <>
      {/* Attachment preview bar */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-card border-t border-border flex flex-wrap gap-2 shrink-0">
          {attachments.map((att, idx) => (
            <div key={att.preview} className="relative group">
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-border relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.preview}
                  alt={att.name}
                  className="w-full h-full object-cover"
                />
                {!att.assetId && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                aria-label={t("removeAttachment")}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity max-md:-top-2 max-md:-right-2 max-md:size-6 max-md:opacity-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Rich Reply Editor */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-border bg-card p-3 shrink-0"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 overflow-x-auto rounded-t-md border border-border/70 bg-muted/40 px-3 py-1.5">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={toolbarButtonClass(editor?.isActive("heading", { level: 1 }))}
            >
              H1
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={toolbarButtonClass(editor?.isActive("heading", { level: 2 }))}
            >
              H2
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              className={toolbarButtonClass(editor?.isActive("heading", { level: 3 }))}
            >
              H3
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().setParagraph().run()}
              className={toolbarButtonClass(editor?.isActive("paragraph"))}
            >
              {t("paragraph")}
            </button>

            <span className="mx-1 h-4 w-px shrink-0 bg-border" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              aria-label={t("bold")}
              className={toolbarIconClass(editor?.isActive("bold"))}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              aria-label={t("italic")}
              className={toolbarIconClass(editor?.isActive("italic"))}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              aria-label={t("underline")}
              className={toolbarIconClass(editor?.isActive("underline"))}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleLink}
              aria-label={t("insertLink")}
              className={toolbarIconClass(editor?.isActive("link"))}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>

            <span className="mx-1 h-4 w-px shrink-0 bg-border" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              aria-label={t("alignLeft")}
              className={toolbarIconClass(editor?.isActive({ textAlign: "left" }))}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              aria-label={t("alignCenter")}
              className={toolbarIconClass(editor?.isActive({ textAlign: "center" }))}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              aria-label={t("alignRight")}
              className={toolbarIconClass(editor?.isActive({ textAlign: "right" }))}
            >
              <AlignRight className="h-4 w-4" />
            </Button>

            <span className="mx-1 h-4 w-px shrink-0 bg-border" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              aria-label={t("bulletList")}
              className={toolbarIconClass(editor?.isActive("bulletList"))}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              aria-label={t("numberedList")}
              className={toolbarIconClass(editor?.isActive("orderedList"))}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (editor?.isActive("orderedList", { type: "a" })) {
                  editor.chain().focus().toggleOrderedList().run();
                  return;
                }

                editor
                  ?.chain()
                  .focus()
                  .toggleOrderedList()
                  .updateAttributes("orderedList", { type: "a" })
                  .run();
              }}
              className={cn(
                toolbarButtonClass(editor?.isActive("orderedList", { type: "a" })),
                "gap-1 border border-border px-2"
              )}
            >
              a-b-c
            </button>

            <span className="mx-1 h-4 w-px shrink-0 bg-border" />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isUploadingAttachment}
              onClick={() => fileInputRef.current?.click()}
              aria-label={t("attachImage")}
              className={toolbarIconClass(false)}
            >
              {isUploadingAttachment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="relative rounded-b-md border border-t-0 border-border/70 bg-muted/20">
            {editor && editor.isEmpty && (
              <div className="pointer-events-none absolute left-4 top-3 select-none text-sm text-muted-foreground/70 max-sm:text-base">
                {t("replyPlaceholder")}
              </div>
            )}
            <EditorContent
              editor={editor}
              className="min-h-[96px] max-h-44 overflow-y-auto px-4 py-3 text-sm max-sm:text-base outline-none focus-within:ring-1 focus-within:ring-primary [&_.ProseMirror]:min-h-[72px] [&_.ProseMirror]:outline-none [&_a]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {attachments.length > 0 && !hasText && (
              <p className="text-xs text-muted-foreground">{t("replyTextRequired")}</p>
            )}
            <Button type="submit" disabled={!canSendReply}>
              {isUploadingAttachment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("sendReply")}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
