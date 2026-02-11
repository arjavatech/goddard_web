import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Check, Crown, Building } from 'lucide-react';
import { SubscriptionPlan, UserSubscription, fetchSubscriptionPlans, fetchUserSubscription, createSubscription } from '../../services/api/subscriptions';
import { fetchUserContext } from '../../services/api/user';
import { useToast } from '../../contexts/ToastContext';
import { Loading } from '../ui/loading';

export function SubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await fetchUserContext();
      // Mock data for now since API endpoints don't exist yet
      const mockPlans: SubscriptionPlan[] = [
        {
          id: '1',
          name: 'Basic',
          maxSchools: 1,
          price: 29,
          features: ['1 School', 'Basic Support', 'Standard Features'],
          isActive: true
        },
        {
          id: '2', 
          name: 'Premium',
          maxSchools: 5,
          price: 99,
          features: ['Up to 5 Schools', 'Priority Support', 'Advanced Features', 'Analytics Dashboard'],
          isActive: true
        },
        {
          id: '3',
          name: 'Enterprise', 
          maxSchools: 25,
          price: 299,
          features: ['Up to 25 Schools', '24/7 Support', 'All Features', 'Custom Integrations'],
          isActive: true
        }
      ];
      
      const mockSubscription: UserSubscription | null = null; // No active subscription
      
      setPlans(mockPlans);
      setUserSubscription(mockSubscription);
    } catch (error) {
      showToast('error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setSubscribing(planId);
      const user = await fetchUserContext();
      
      // Mock subscription creation
      const selectedPlan = plans.find(p => p.id === planId);
      if (selectedPlan) {
        const mockSubscription: UserSubscription = {
          id: 'sub_' + Date.now(),
          userId: user.id,
          planId: planId,
          status: 'active',
          currentSchools: 0,
          maxSchools: selectedPlan.maxSchools,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          createdAt: new Date().toISOString()
        };
        setUserSubscription(mockSubscription);
        showToast('success', 'Subscription activated successfully!');
      }
    } catch (error) {
      showToast('error', 'Failed to activate subscription');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return <Loading message="Loading subscription plans..." />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">Select a subscription plan to manage schools</p>
      </div>

      {userSubscription && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-green-600" />
                <span className="font-medium">Current Plan: {plans.find(p => p.id === userSubscription.planId)?.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Schools: {userSubscription.currentSchools}/{userSubscription.maxSchools}</span>
                <Badge variant={userSubscription.status === 'active' ? 'success' : 'destructive'}>
                  {userSubscription.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.name === 'Premium' ? 'border-amazon-teal shadow-lg' : ''}`}>
            {plan.name === 'Premium' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-amazon-teal text-white">Most Popular</Badge>
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Building className="h-5 w-5" />
                {plan.name}
              </CardTitle>
              <div className="text-3xl font-bold">${plan.price}<span className="text-sm font-normal">/month</span></div>
              <p className="text-muted-foreground">Up to {plan.maxSchools} schools</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.name === 'Premium' ? 'default' : 'outline'}
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscribing === plan.id || (userSubscription?.planId === plan.id && userSubscription.status === 'active')}
              >
                {subscribing === plan.id ? 'Activating...' : 
                 userSubscription?.planId === plan.id && userSubscription.status === 'active' ? 'Current Plan' : 
                 'Select Plan'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}