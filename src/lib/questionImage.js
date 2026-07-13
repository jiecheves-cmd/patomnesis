const DEFAULT_IMAGE_BUCKET = "question-images";

function getSupabaseUrl() {
  return import.meta.env?.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
}

function getGoogleDriveFileId(url) {
  const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
  return pathMatch?.[1] || url.searchParams.get("id");
}

function resolveQuestionImageUrl(value, supabaseUrl = getSupabaseUrl()) {
  const source = String(value || "").trim();
  if (!source) return "";

  if (/^(data:image\/|blob:)/i.test(source) || /^\/(?!\/)/.test(source)) return source;

  let candidate = source;
  if (candidate.startsWith("//")) candidate = `https:${candidate}`;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(candidate)) candidate = `https://${candidate}`;

  if (!/^[a-z][a-z\d+.-]*:/i.test(candidate)) {
    if (!supabaseUrl) return candidate;
    const objectPath = candidate
      .replace(/^\/+/, "")
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return `${supabaseUrl}/storage/v1/object/public/${DEFAULT_IMAGE_BUCKET}/${objectPath}`;
  }

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return candidate;
  }

  if (url.hostname === "drive.google.com") {
    const fileId = getGoogleDriveFileId(url);
    if (fileId) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
  }

  if (url.hostname === "dropbox.com" || url.hostname === "www.dropbox.com") {
    url.searchParams.delete("dl");
    url.searchParams.set("raw", "1");
    return url.toString();
  }

  return url.toString();
}

export { DEFAULT_IMAGE_BUCKET, resolveQuestionImageUrl };
