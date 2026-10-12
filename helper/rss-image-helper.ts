/**
 * Map RSS source / publisher to its corresponding logo image.
 * Supports multiple identifiers (publisher, title, url, name) to ensure
 * robust matching even when partial feed metadata is returned.
 *
 * Supported publishers:
 * - Antara News: /antara.png
 * - CNBC Indonesia: /cnbc.png
 * - Detikcom: /detik.svg
 * - CNN Indonesia: /cnn.svg
 * - Liputan 6: /liputan6.svg
 * - Kompas: /kompas.svg
 * - Tempo: /tempo.svg
 * - Fallback: /rss-default.svg
 */

export const getRssSourceImage = (
  ...identifiers: (string | undefined | null)[]
): string => {
  const combined = identifiers
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (!combined) {
    return "/rss-default.svg";
  }

  // 1. Antara News
  if (
    combined.includes("antara") ||
    combined.includes("antaranews")
  ) {
    return "/antara.png";
  }

  // 2. CNBC Indonesia
  if (
    combined.includes("cnbc")
  ) {
    return "/cnbc.png";
  }

  // 3. Detikcom
  if (
    combined.includes("detik")
  ) {
    return "/detik.svg";
  }

  // 4. CNN Indonesia
  if (
    combined.includes("cnn") ||
    combined.includes("cnn_indonesia") ||
    combined.includes("cnnindonesia")
  ) {
    return "/cnn.svg";
  }

  // 5. Liputan 6
  if (
    combined.includes("liputan") ||
    combined.includes("liputan6") ||
    combined.includes("liputan_6")
  ) {
    return "/liputan6.svg";
  }

  // 6. Kompas
  if (
    combined.includes("kompas")
  ) {
    return "/kompas.svg";
  }

  // 7. Tempo
  if (
    combined.includes("tempo")
  ) {
    return "/tempo.svg";
  }

  // Fallback to high-quality RSS logo
  return "/rss-default.svg";
};

