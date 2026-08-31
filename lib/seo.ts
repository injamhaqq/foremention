import type { Metadata } from "next";

export const SITE_URL = "https://foremention.com";
export const SITE_NAME = "Foremention";

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

type StructuredPageInput = {
  name: string;
  description: string;
  path: string;
};

type DefinedTermSetInput = StructuredPageInput & {
  terms: Array<{ name: string; description: string }>;
};

function absoluteUrl(path: string) {
  return new URL(path || "/", SITE_URL).toString();
}

export function pageMetadata({ title, description, path, noIndex = false }: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: canonical, type: "website", siteName: SITE_NAME },
    twitter: { card: "summary", title: `${title} | ${SITE_NAME}`, description },
  };
}

export function articleMetadata({ title, description, path, publishedTime, modifiedTime }: ArticleMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  const base = pageMetadata({ title, description, path });
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", url: canonical, publishedTime, modifiedTime, authors: [`${SITE_URL}/about`] },
  };
}

export function webPageJsonLd({ name, description, path }: StructuredPageInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function collectionPageJsonLd({ name, description, path }: StructuredPageInput) {
  return { ...webPageJsonLd({ name, description, path }), "@type": "CollectionPage" };
}

export function definedTermSetJsonLd({ name, description, path, terms }: DefinedTermSetInput) {
  return {
    ...webPageJsonLd({ name, description, path }),
    "@type": "DefinedTermSet",
    hasDefinedTerm: terms.map((term) => ({ "@type": "DefinedTerm", name: term.name, description: term.description })),
  };
}
