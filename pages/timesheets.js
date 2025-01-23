import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TimesheetsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/timesheet');
  }, []);

  return null;
}
