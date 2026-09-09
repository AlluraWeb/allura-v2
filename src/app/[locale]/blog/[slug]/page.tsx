import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/supabase/blog";
import { BlogPostTemplate } from "@/components/templates/BlogPostTemplate";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Not Found" };

  const loc = locale as "es" | "en";
  const title = (post.title as { es: string; en: string })?.[loc] || (post.title as { es: string; en: string })?.es;
  const excerpt = (post.excerpt as { es: string; en: string })?.[loc] || (post.excerpt as { es: string; en: string })?.es;
  const seoTitle = (post.seoTitle as { es: string; en: string })?.[loc];
  const seoDesc = (post.seoDescription as { es: string; en: string })?.[loc];

  return {
    title: seoTitle || title || "Blog — Allura Healthcare",
    description: seoDesc || excerpt,
  };
}

export default async function BlogPostPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const [post, allPosts] = await Promise.all([
    getBlogPostBySlug(slug),
    getBlogPosts(),
  ])
  if (!post) notFound();

  const mappedPost = {
    _id: post.id,
    title: post.title as { es: string; en: string },
    slug: { current: post.slug },
    excerpt: post.excerpt as { es: string; en: string },
    body: post.body as { es: string; en: string },
    publishedAt: post.publishedAt ?? new Date().toISOString(),
    featuredImage: post.coverImageUrl
      ? {
          asset: { _id: post.id, url: post.coverImageUrl },
          alt: { es: post.coverImageAlt ?? "", en: post.coverImageAlt ?? "" },
        }
      : undefined,
    author: post.author ? { name: post.author } : undefined,
    category: post.category,
  };

  // Related: same category first, then recent, exclude current
  const otherPosts = allPosts.filter(p => p.slug !== slug)
  const related = [
    ...otherPosts.filter(p => post.category && p.category === post.category),
    ...otherPosts.filter(p => !post.category || p.category !== post.category),
  ].slice(0, 3).map(p => ({
    _id: p.id,
    title: p.title as { es: string; en: string },
    slug: { current: p.slug },
    excerpt: p.excerpt as { es: string; en: string },
    publishedAt: p.publishedAt ?? '',
    category: p.category,
    featuredImage: p.coverImageUrl
      ? { asset: { url: p.coverImageUrl }, alt: { es: '', en: '' } }
      : undefined,
  }))

  return <BlogPostTemplate post={mappedPost as any} locale={locale} relatedPosts={related} />;
}
