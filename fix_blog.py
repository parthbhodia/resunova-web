with open('lib/atsBlogPosts.ts', 'r', encoding='utf-8') as f:
    content = f.read()

funcs = """
export function createBlogPostMetadata(slug: string) {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  return {
    title: post?.title,
    description: post?.description,
  };
}

export function formatPublishedAt(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString();
}

export function hasFinding(post: BlogPostMeta) {
  return !!post.publishedAt;
}

export function createBlogPostJsonLd(slug: string) {
  return {};
}

export function blogPostBySlug(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function blogPostCanonical(slug: string) {
  return https://resunova.com/blog/;
}
"""

with open('lib/atsBlogPosts.ts', 'a', encoding='utf-8') as f:
    f.write("\n" + funcs)

print("Added missing blog functions")
