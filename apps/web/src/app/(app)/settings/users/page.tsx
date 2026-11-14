'use client';

// Redirect to main users page (settings/users shows same team management)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsUsersPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/users'); }, [router]);
  return null;
}
