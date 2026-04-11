import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getBlog, likeBlog, deleteBlog } from '../../api/blogs.js';
import { getComments, addComment, deleteComment } from '../../api/comments.js';
import { getApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { Spinner } from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import { formatDate, readingTime } from '../../lib/utils.js';
import { ArrowLeft, Heart, MessageCircle, Edit, Trash2, Send } from 'lucide-react';

export default function BlogDetail({ id }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [, setLocation] = useLocation();
  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    Promise.all([getBlog(id), getComments(id)])
      .then(([b, c]) => {
        setBlog(b.blog || b);
        setComments(Array.isArray(c) ? c : c.comments || c.data || []);
      })
      .catch(() => addToast('Failed to load blog', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    setLiking(true);
    try {
      const data = await likeBlog(id);
      setBlog((prev) => ({ ...prev, ...(data.blog || data) }));
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const data = await addComment(id, { text: commentText });
      const created = data.comment || data;
      setComments((prev) => [
        {
          ...created,
          user: created.user && typeof created.user === 'object' ? created.user : user,
        },
        ...prev,
      ]);
      setCommentText('');
      addToast('Comment posted!', 'success');
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = async (cid) => {
    try {
      await deleteComment(cid);
      setComments((prev) => prev.filter((c) => (c._id || c.id) !== cid));
      addToast('Comment removed', 'success');
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  const handleDeleteBlog = async () => {
    if (!confirm('Delete this blog post permanently?')) return;
    try {
      let adminTotp;
      if (user?.role === 'admin') {
        adminTotp = prompt('Enter Google Authenticator code to delete this blog');
        if (!adminTotp) return;
      }
      await deleteBlog(id, adminTotp);
      addToast('Blog deleted', 'success');
      setLocation('/blogs');
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <Spinner size="lg" />
    </div>
  );

  if (!blog) return (
    <div className="text-center py-24">
      <p className="text-muted-foreground">Blog not found.</p>
      <button onClick={() => setLocation('/blogs')} className="btn-primary mt-4 px-6 py-3 rounded-xl">
        Back to Blogs
      </button>
    </div>
  );

  const isOwner = blog.author?._id === user?._id || blog.author?.id === user?.id;
  const isAdmin = user?.role === 'admin';
  const likes = Array.isArray(blog.likes) ? blog.likes : [];
  const likesCount = typeof blog.likes === 'number' ? blog.likes : likes.length;
  const currentUserId = String(user?._id || user?.id || '');
  const likeIds = likes.map((like) => {
    if (like && typeof like === 'object') {
      return String(like._id || like.id || '');
    }
    return String(like || '');
  });
  const isLiked = currentUserId ? likeIds.includes(currentUserId) : false;
  const authorName = blog.author?.firstName
    ? `${blog.author.firstName} ${blog.author.lastName || ''}`.trim()
    : blog.author?.email || 'Unknown';

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => setLocation('/blogs')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Blogs
      </button>

      {/* Article */}
      <article className="glass rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-8">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center text-white font-bold">
              {(blog.author?.firstName?.[0] || blog.author?.email?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{authorName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(blog.createdAt)} · {readingTime(blog.content)}
              </p>
            </div>
            {(isOwner || isAdmin) && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setLocation(`/blogs/${id}/edit`)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteBlog}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight">{blog.title}</h1>

          <div className="prose-dark text-base whitespace-pre-wrap leading-relaxed">
            {blog.content}
          </div>
        </div>

        {/* Actions bar */}
        <div className="px-8 py-4 border-t border-border/40 flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isLiked ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-400' : ''} ${liking ? 'animate-pulse' : ''}`} />
            {likesCount || blog.likesCount || 0} likes
          </button>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="w-5 h-5" />
            {comments.length} comments
          </span>
        </div>
      </article>

      {/* Comments */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-foreground">Comments ({comments.length})</h2>

        {/* Add comment */}
        <form onSubmit={handleComment} className="glass rounded-2xl border border-border/50 p-5 space-y-3">
          <p className="text-sm font-medium text-foreground">Leave a comment</p>
          <textarea
            className="input-field w-full px-4 py-3 text-sm resize-none"
            rows={3}
            placeholder="Share your thoughts..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={commenting}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={commenting} size="sm" disabled={!commentText.trim()}>
              <Send className="w-3.5 h-3.5" />
              Post Comment
            </Button>
          </div>
        </form>

        {/* Comment list */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center border border-border/50">
              <MessageCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Be the first to comment.</p>
            </div>
          ) : (
            comments.map((c, i) => {
              const commenter = c.user && typeof c.user === 'object' ? c.user : c.author;
              const commenterId = typeof c.user === 'string' ? c.user : commenter?._id || commenter?.id;
              const canDelete = commenterId === user?._id || commenterId === user?.id || isAdmin;
              return (
                <div
                  key={c._id || c.id}
                  className="glass rounded-xl border border-border/40 p-4 animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-green flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(commenter?.firstName?.[0] || commenter?.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {commenter?.firstName || commenter?.email || 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(c._id || c.id)}
                            className="ml-auto p-1 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{c.text || c.content}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
