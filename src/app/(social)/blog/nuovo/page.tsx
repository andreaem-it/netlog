import { createBlogPostAction } from "@/features/blog/actions";
import { BlogPostForm } from "@/features/blog/components/blog-post-form";

export const metadata = { title: "Nuovo post" };

export default function NewBlogPostPage() {
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">NUOVO POST</p>
          <h1>Scrivi qualcosa di più lungo.</h1>
        </div>
      </div>
      <section className="card card-body">
        <BlogPostForm action={createBlogPostAction} submitLabel="Pubblica" />
      </section>
    </>
  );
}
