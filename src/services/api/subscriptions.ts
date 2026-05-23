import { httpFetch } from './http';

export interface SubscriptionPlan {
  id: string;
  name: string;
  maxSchools: number;
  price: number;
  features: string[];
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'expired' | 'cancelled';
  currentSchools: number;
  maxSchools: number;
  expiresAt: string;
  createdAt: string;
}

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await httpFetch<SubscriptionPlan[]>({
    method: 'GET',
    url: '/api/subscription-plans'
  });
  return response.data;
};

export const fetchUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  const response = await httpFetch<UserSubscription | null>({
    method: 'GET',
    url: `/api/users/${userId}/subscription`
  });
  return response.data;
};

export const createSubscription = async (userId: string, planId: string): Promise<UserSubscription> => {
  const response = await httpFetch<UserSubscription>({
    method: 'POST',
    url: '/api/subscriptions',
    body: { userId, planId }
  });
  return response.data;
};

export const checkSchoolCreationLimit = async (userId: string): Promise<{ canCreate: boolean; reason?: string }> => {
  const response = await httpFetch<{ canCreate: boolean; reason?: string }>({
    method: 'GET',
    url: `/api/users/${userId}/school-limit-check`
  });
  return response.data;
};