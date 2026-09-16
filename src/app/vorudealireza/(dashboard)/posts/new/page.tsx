import { listImageMedia } from '@/services/posts.service';
import { PostForm } from '../_components/post-form';

export default async function NewPostPage() {
  const images = await listImageMedia();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">New post</h1>
      <p className="text-sm text-muted mt-2">Write in HTML — it is sanitized server-side on save.</p>
      <div className="mt-8">
        <PostForm post={{}} images={images} />
      </div>
    </div>
  );
}
