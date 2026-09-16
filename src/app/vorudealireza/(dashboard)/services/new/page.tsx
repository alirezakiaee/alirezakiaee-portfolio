import { ServiceForm } from '../_components/service-form';

export default function NewServicePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">New service</h1>
      <div className="mt-8">
        <ServiceForm service={{}} />
      </div>
    </div>
  );
}
