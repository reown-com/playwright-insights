import { Suspense } from 'react';
import DashboardClient from '@/components/dashboard/dashboard-client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardClient />
    </Suspense>
  );
}
