import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getBlog, updateBlog } from '../../api/blogs.js';
import { getApiError } from '../../api/client.js';
import { useToast } from '../../components/common/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner } from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { ArrowLeft, Save } from 'lucide-react';

export default function BlogEdit({ id }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getBlog(id)
      .then((data) => {
        const blog = data.blog || data;
        setForm({ title: blog.title || '', content: blog.content || '' });
      })
      .catch(() => addToast('Failed to load blog', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.length < 5) e.title = 'Title must be at least 5 characters';
    if (!form.content.trim()) e.content = 'Content is required';
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
    setSaving(true);
    try {
      let adminTotp;
      if (user?.role === 'admin') {
        adminTotp = prompt('Enter Google Authenticator code to update this blog');
        if (!adminTotp) {
          setSaving(false);
          return;
        }
      }
      await updateBlog(id, form, adminTotp);
      addToast('Blog updated!', 'success');
      setLocation(`/blogs/${id}`);
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setLocation(`/blogs/${id}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Cancel
        </button>
        <h1 className="text-2xl font-bold text-foreground">Edit Blog Post</h1>
      </div>

      <form onSubmit={submit} className="glass rounded-2xl border border-border/50 p-6 sm:p-8 space-y-5">
        <Input
          label="Blog Title"
          name="title"
          value={form.title}
          onChange={handle}
          placeholder="Blog title..."
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
            placeholder="Write your content..."
            className={`input-field px-4 py-3 text-sm resize-y min-h-[280px] leading-relaxed ${errors.content ? 'border-destructive/70' : ''}`}
          />
          {errors.content && <p className="text-xs text-red-400">{errors.content}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} size="lg" className="flex-1 sm:flex-none px-10">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => setLocation(`/blogs/${id}`)}>
            Discard
          </Button>
        </div>
      </form>
    </div>
  );
}
