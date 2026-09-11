-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_posts_author_id_created_at_id_idx" ON "blog_posts"("author_id", "created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same convention as comments/messages: no blank posts.
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_post_title_not_empty" CHECK (length(btrim(title)) > 0);
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_post_body_not_empty" CHECK (length(btrim(body)) > 0);
