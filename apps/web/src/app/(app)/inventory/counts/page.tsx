'use client';

import { PageHeader, Button, EmptyState } from '@/components/ui';

export default function StockCountsPage() {
  return (
    <div>
      <PageHeader
        title="Stock Counts"
        subtitle="Periodic physical counts reconciled against system quantities"
        actions={<Button>+ New count</Button>}
      />
      <EmptyState
        icon="📊"
        title="No stock counts yet"
        description="Start a stock count to reconcile physical inventory with system records"
        action={<Button>Start stock count</Button>}
      />
    </div>
  );
}
