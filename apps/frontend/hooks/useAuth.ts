'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return { user, isAuthenticated, isLoading, logout };
}

export function useProtectedRoute() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}
