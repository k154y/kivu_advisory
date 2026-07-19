"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { BlogPostForm } from "@/components/admin/blog-post-form";
import { api } from "@/lib/api";
import type { AdminBlogPost } from "@/lib/admin-blog";

export default function AdminBlogEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPost = async () => {
      setIsLoading(true);
      setFailed(false);

      try {
        const result = await api.get<AdminBlogPost>(
          `/admin/blog/detail?id=${encodeURIComponent(id)}`,
        );

        if (!cancelled) {
          setPost(result.data);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setPost(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      void loadPost();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm font-medium text-gray-500">
          Loading blog post...
        </p>
      </div>
    );
  }

  if (failed || !post) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold text-navy">
            Blog post not found
          </h1>

          <p className="mb-6 text-gray-600">
            The blog post you are trying to edit could not be loaded.
          </p>

          <Link
            href="/admin/blog"
            className="inline-flex rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return <BlogPostForm mode="edit" initialPost={post} />;
}