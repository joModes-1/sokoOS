'use client';

import { useEffect, useState } from 'react';

export interface BusinessContext {
  businessId: string;
  branchId: string;
  industryCode: string;
  businessName: string;
  userName: string;
}

export function useBusinessContext(): BusinessContext {
  const [ctx, setCtx] = useState<BusinessContext>({
    businessId: '',
    branchId: '',
    industryCode: 'RETAIL',
    businessName: '',
    userName: '',
  });

  useEffect(() => {
    try {
      setCtx({
        businessId: sessionStorage.getItem('sokoos_business_id') ?? '',
        branchId: sessionStorage.getItem('sokoos_branch_id') ?? '',
        industryCode: sessionStorage.getItem('sokoos_industry') ?? 'RETAIL',
        businessName: sessionStorage.getItem('sokoos_business_name') ?? '',
        userName: sessionStorage.getItem('sokoos_user_name') ?? '',
      });
    } catch {}
  }, []);

  return ctx;
}
