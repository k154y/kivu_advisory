DROP INDEX IF EXISTS idx_blog_posts_created_at;
DROP INDEX IF EXISTS idx_blog_posts_published_at;
DROP INDEX IF EXISTS idx_blog_posts_author_user_id;
DROP INDEX IF EXISTS idx_blog_posts_is_featured;
DROP INDEX IF EXISTS idx_blog_posts_category;
DROP INDEX IF EXISTS idx_blog_posts_status;
DROP INDEX IF EXISTS idx_blog_posts_slug;

DROP TABLE IF EXISTS blog_posts;