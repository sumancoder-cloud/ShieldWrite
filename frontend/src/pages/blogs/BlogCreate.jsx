import { useState } from 'react';
import { useLocation } from 'wouter';
import { createBlog } from '../../api/blogs.js';
import { getApiError } from '../../api/client.js';
import { useToast } from '../../components/common/Toast.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { ArrowLeft, PenLine, Eye, EyeOff } from 'lucide-react';
import { readingTime } from '../../lib/utils.js';

export default function BlogCreate() {
  const [, setLocation] = useLocation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.length < 5) e.title = 'Title must be at least 5 characters';
    if (!form.content.trim()) e.content = 'Content is required';
    else if (form.content.length < 20) e.content = 'Content must be at least 20 characters';
    return e;
  };

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const data = await createBlog(form);
      addToast('Blog published!', 'success');
      setLocation(`/blogs/${data.blog?._id || data.blog?.id || data._id || data.id}`);
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setLocation('/blogs')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Cancel
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Write a New Blog</h1>
          {form.content && (
            <p className="text-xs text-muted-foreground mt-0.5">{readingTime(form.content)}</p>
          )}
        </div>
        <button
          onClick={() => setPreview(!preview)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors glass border border-border/50 rounded-xl px-3 py-1.5"
        >
          {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="glass rounded-2xl border border-border/50 p-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-6 leading-tight">
            {form.title || <span className="text-muted-foreground italic">No title yet…</span>}
          </h2>
          <div className="prose-dark whitespace-pre-wrap leading-relaxed">
            {form.content || <span className="text-muted-foreground italic">No content yet…</span>}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="glass rounded-2xl border border-border/50 p-6 sm:p-8 space-y-5">
          <Input
            label="Blog Title"
            name="title"
            value={form.title}
            onChange={handle}
            placeholder="Give your post an engaging title..."
            error={errors.title}
            autoFocus
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground/80">Content</label>
            <textarea
              name="content"
              value={form.content}
              onChange={handle}
              rows={16}
              placeholder="Write your blog post content here... Share your story, insights, or ideas."
              className={`input-field px-4 py-3 text-sm resize-y min-h-[300px] leading-relaxed ${errors.content ? 'border-destructive/70' : ''}`}
            />
            {errors.content && <p className="text-xs text-red-400">{errors.content}</p>}
            <p className="text-xs text-muted-foreground text-right">
              {form.content.length} characters · {form.content.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} size="lg" className="flex-1 sm:flex-none px-10">
              <PenLine className="w-4 h-4" />
              Publish Post
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setLocation('/blogs')}
            >
              Discard
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
