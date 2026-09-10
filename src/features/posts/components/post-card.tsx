import Link from "next/link";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getComments } from "../queries";
import { deleteCommentAction, deletePostAction, toggleLikeAction } from "../actions";
import { CommentForm } from "./comment-form";

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "Tutti",
  FRIENDS: "Solo amici",
  PRIVATE: "Solo io",
};

export async function PostCard({
  post,
  viewerId,
}: {
  post: {
    id: string;
    body: string;
    visibility: string;
    createdAt: Date;
    authorName: string;
    authorUsername: string;
    authorAvatarUrl: string | null;
    owner: boolean;
    likeCount: number;
    commentCount: number;
    likedByViewer: boolean;
  };
  viewerId: string;
}) {
  const comments = post.commentCount > 0 ? await getComments(post.id) : [];
  return (
    <article className="card card-body stack">
      <div className="button-row" style={{ justifyContent: "space-between" }}>
        <Link
          href={`/u/${post.authorUsername}`}
          className="nav-item"
          style={{ height: "auto", padding: 0 }}
        >
          <Avatar name={post.authorName} src={post.authorAvatarUrl} />
          <span>
            <strong>{post.authorName}</strong>
            <br />
            <span className="muted">
              {new Intl.DateTimeFormat("it-IT", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              }).format(post.createdAt)}{" "}
              · {VISIBILITY_LABEL[post.visibility]}
            </span>
          </span>
        </Link>
        {post.owner && (
          <form action={deletePostAction}>
            <input type="hidden" name="postId" value={post.id} />
            <button className="button button-subtle" type="submit" aria-label="Elimina post">
              <Trash2 size={15} />
            </button>
          </form>
        )}
      </div>
      <p style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>
      <div className="button-row">
        <form action={toggleLikeAction}>
          <input type="hidden" name="postId" value={post.id} />
          <button
            className={`button${post.likedByViewer ? " button-primary" : ""}`}
            type="submit"
          >
            <Heart size={15} />
            {post.likeCount}
          </button>
        </form>
        <span className="button button-subtle" aria-hidden="true">
          <MessageCircle size={15} />
          {post.commentCount}
        </span>
      </div>
      {comments.length > 0 && (
        <div className="stack">
          {comments.map((comment) => (
            <div key={comment.id} className="button-row" style={{ justifyContent: "space-between" }}>
              <span>
                <strong>{comment.authorName}</strong> {comment.body}
              </span>
              {comment.authorId === viewerId && (
                <form action={deleteCommentAction}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <button className="button button-subtle" type="submit" aria-label="Elimina commento">
                    <Trash2 size={13} />
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
      <CommentForm postId={post.id} />
    </article>
  );
}
