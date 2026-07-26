import type { Metadata } from "next";

export const SITE_URL = "https://foremention.com";
export const SITE_NAME = "Foremention";
export const SOCIAL_IMAGE = `${SITE_URL}/og.png`;

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

type ArticleMetadataInput = PageMetadataInput & {
  publishedTime: string;
  modifiedTime: string;
};

function absoluteUrl(path: string) {
  return new URL(path || "/", SITE_URL).toString();
}

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
      images: [
        {
          url: SOCIAL_IMAGE,
          width: 1200,
          height: 630,
          alt: "Foremention recommendation intelligence platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [SOCIAL_IMAGE],
    },
  };
}

export function articleMetadata({
  title,
  description,
  path,
  publishedTime,
  modifiedTime,
}: ArticleMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  const base = pageMetadata({ title, description, path });

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      url: canonical,
      publishedTime,
      modifiedTime,
      authors: [`${SITE_URL}/about`],
    },
  };
}
