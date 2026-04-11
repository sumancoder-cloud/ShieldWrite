import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getBlogs, deleteBlog, likeBlog } from '../../api/blogs.js';
import { getApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { Spinner } from '../../components/common/Loader.jsx';
import { formatDateShort, truncate, readingTime } from '../../lib/utils.js';
import {
  PlusCircle, Heart, MessageCircle, Edit, Trash2,
  Search, Filter, BookOpen, ArrowRight
} from 'lucide-react';

function BlogCard({ blog, user, onDelete, onLike, setLocation }) {
  const isOwner = blog.author?._id === user?._id || blog.author?.id === user?.id || blog.authorId === user?.id;
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
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    setLiking(true);
    await onLike(blog._id || blog.id);
    setLiking(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this blog post?')) return;
    setDeleting(true);
    await onDelete(blog._id || blog.id);
    setDeleting(false);
  };

  return (
    <div
      className="glass rounded-2xl border border-border/50 card-hover overflow-hidden cursor-pointer flex flex-col group"
      onClick={() => setLocation(`/blogs/${blog._id || blog.id}`)}
    >
      <div className="p-6 flex-1">
        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(blog.author?.firstName?.[0] || blog.author?.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {blog.author?.firstName ? `${blog.author.firstName} ${blog.author.lastName || ''}`.trim() : blog.author?.email || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground">{formatDateShort(blog.createdAt)}</p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground bg-muted/40 rounded-full px-2.5 py-0.5">
            {readingTime(blog.content)}
          </span>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {blog.title}
        </h2>
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {truncate(blog.content || blog.excerpt || '', 160)}
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 border-t border-border/40 flex items-center gap-3">
        <button
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            isLiked ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-400' : ''} ${liking ? 'animate-pulse' : ''}`} />
          {likesCount || blog.likesCount || 0}
        </button>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          {blog.commentsCount || 0}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {(isOwner || isAdmin) && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLocation(`/blogs/${blog._id || blog.id}/edit`); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                {deleting ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
          <span className="text-primary">
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BlogList() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [, setLocation] = useLocation();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBlogs = () => {
    setLoading(true);
    getBlogs()
      .then((data) => setBlogs(Array.isArray(data) ? data : data.blogs || data.data || []))
      .catch(() => addToast('Failed to load blogs', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBlogs(); }, []);

  const handleDelete = async (id) => {
    try {
      let adminTotp;
      if (user?.role === 'admin') {
        adminTotp = prompt('Enter Google Authenticator code to delete this blog');
        if (!adminTotp) return;
      }
      await deleteBlog(id, adminTotp);
      setBlogs((prev) => prev.filter((b) => (b._id || b.id) !== id));
      addToast('Blog deleted', 'success');
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  const handleLike = async (id) => {
    try {
      const updated = await likeBlog(id);
      setBlogs((prev) =>
        prev.map((b) => (b._id || b.id) === id ? { ...b, ...(updated.blog || updated) } : b)
      );
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  const filtered = blogs.filter(
    (b) =>
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      (b.content || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Blogs</h1>
          <p className="text-muted-foreground mt-1">{blogs.length} posts published</p>
        </div>
        <button
          onClick={() => setLocation('/blogs/new')}
          className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 self-start"
        >
          <PlusCircle className="w-4 h-4" />
          Write Blog
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="input-field w-full pl-11 pr-4 py-3 text-sm"
          placeholder="Search blogs by title or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Blogs grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center border border-border/50">
          <BookOpen className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {search ? 'No results found' : 'No blogs yet'}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {search ? 'Try different keywords.' : 'Be the first to write a post.'}
          </p>
          {!search && (
            <button onClick={() => setLocation('/blogs/new')} className="btn-primary px-6 py-3 rounded-xl">
              Create First Post
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((blog, i) => (
            <div key={blog._id || blog.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <BlogCard
                blog={blog}
                user={user}
                onDelete={handleDelete}
                onLike={handleLike}
                setLocation={setLocation}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
