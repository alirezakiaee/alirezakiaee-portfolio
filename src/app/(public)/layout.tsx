import { PublicEffects } from '@/components/public/public-effects';
import { SiteHeader } from '@/components/public/site-header';
import { SiteFooter } from '@/components/public/site-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicEffects />
      <div className="grain" aria-hidden="true" />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
