import { ProjectForm } from '../_components/project-form';

export default function NewProjectPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">New project</h1>
      <p className="text-sm text-muted mt-2">Fill in the basics — everything else is optional.</p>
      <div className="mt-8">
        <ProjectForm project={{}} />
      </div>
    </div>
  );
}
