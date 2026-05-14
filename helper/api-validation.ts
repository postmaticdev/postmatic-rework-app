import { AxiosError } from "axios";

type FieldMap = Record<string, string>;

type ValidationValue =
  | string
  | string[]
  | { message?: string; msg?: string; error?: string }
  | Array<{ field?: string; path?: string; param?: string; message?: string; msg?: string; error?: string }>;

const getErrorData = (error: unknown) => {
  if (error instanceof AxiosError) return error.response?.data;
  return null;
};

const normalizeMessage = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(normalizeMessage).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeMessage(record.message ?? record.msg ?? record.error);
  }
  return "";
};

export const getApiValidationErrors = (
  error: unknown,
  fieldMap: FieldMap = {}
): Record<string, string> => {
  const data = getErrorData(error) as
    | { validationErrors?: unknown; errors?: unknown }
    | null;
  const validation = data?.validationErrors ?? data?.errors;
  const output: Record<string, string> = {};

  const add = (field: string | undefined, message: unknown) => {
    const normalizedField = fieldMap[field ?? ""] ?? field;
    const normalizedMessage = normalizeMessage(message);
    if (normalizedField && normalizedMessage) {
      output[normalizedField] = normalizedMessage;
    }
  };

  if (Array.isArray(validation)) {
    validation.forEach((item) => {
      if (typeof item === "string") {
        add("_form", item);
        return;
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        add(
          String(record.field ?? record.path ?? record.param ?? ""),
          record.message ?? record.msg ?? record.error
        );
      }
    });
    return output;
  }

  if (validation && typeof validation === "object") {
    Object.entries(validation as Record<string, ValidationValue>).forEach(
      ([field, message]) => add(field, message)
    );
  }

  return output;
};

export const getFirstValidationMessage = (
  validationErrors: Record<string, string>
) => Object.values(validationErrors).find(Boolean);
