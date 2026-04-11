import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../context/AuthContext.jsx';
import { getBlogs } from '../api/blogs.js';
import { Spinner } from '../components/common/Loader.jsx';
import { formatDateShort, truncate, readingTime } from '../lib/utils.js';
import { FileText, Heart, PlusCircle, TrendingUp, BookOpen, Users, ArrowRight, Edit } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, gradient }) {
  return (
    <div className={`glass rounded-2xl p-6 border border-border/50 card-hover relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${gradient} opacity-10 -translate-y-4 translate-x-4`} />
      <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center mb-4`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogs()
      .then((data) => setBlogs(Array.isArray(data) ? data : data.blogs || data.data || []))
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, []);

  const totalLikes = blogs.reduce((sum, b) => sum + (b.likes?.length || b.likesCount || 0), 0);
  const myBlogs = blogs.filter((b) => b.author?._id === user?._id || b.author?.id === user?.id || b.authorId === user?.id);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'Writer';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {greeting()}, <span className="text-gradient-orange">{firstName}</span> ✦
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening on ShieldWrite today.</p>
        </div>
        <button
          onClick={() => setLocation('/blogs/new')}
          className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          New Blog Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Blogs" value={loading ? '...' : blogs.length} gradient="gradient-orange" />
        <StatCard icon={BookOpen} label="My Posts" value={loading ? '...' : myBlogs.length} gradient="gradient-green" />
        <StatCard icon={Heart} label="Total Likes" value={loading ? '...' : totalLikes} gradient="gradient-dusky" />
        <StatCard icon={TrendingUp} label="My Rank" value={user?.role === 'admin' ? 'Admin' : 'Member'} gradient="gradient-orange" />
      </div>

      {/* Recent blogs */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">Recent Posts</h2>
          <button
            onClick={() => setLocation('/blogs')}
            className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-border/50">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Be the first to share something amazing.</p>
            <button onClick={() => setLocation('/blogs/new')} className="btn-primary px-6 py-3 rounded-xl">
              Write Your First Post
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {blogs.slice(0, 6).map((blog, i) => {
              const isOwner = blog.author?._id === user?._id || blog.author?.id === user?.id || blog.authorId === user?.id;
              return (
                <div
                  key={blog._id || blog.id}
                  className="glass rounded-2xl border border-border/50 card-hover overflow-hidden flex flex-col animate-fade-up"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full gradient-orange flex items-center justify-center text-white text-xs font-bold">
                        {(blog.author?.firstName?.[0] || blog.author?.email?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {blog.author?.firstName || blog.author?.email || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{readingTime(blog.content)}</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-2 line-clamp-2 leading-snug">{blog.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {truncate(blog.content || blog.excerpt, 100)}
                    </p>
                  </div>
                  <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {blog.likes?.length || blog.likesCount || 0}
                      </span>
                      <span>{formatDateShort(blog.createdAt)}</span>
                    </div>
                    <div className="flex gap-2">
                      {isOwner && (
                        <button
                          onClick={() => setLocation(`/blogs/${blog._id || blog.id}/edit`)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setLocation(`/blogs/${blog._id || blog.id}`)}
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                      >
                        Read <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
