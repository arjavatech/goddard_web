import React from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Check, Crown, Building } from 'lucide-react';

export function SubscriptionManagement() {
  const plans = [
    {
      id: '1',
      name: 'Basic',
      maxSchools: 1,
      price: 29,
      features: ['1 School', 'Basic Support', 'Standard Features']
    },
    {
      id: '2', 
      name: 'Premium',
      maxSchools: 5,
      price: 99,
      features: ['Up to 5 Schools', 'Priority Support', 'Advanced Features', 'Analytics Dashboard']
    },
    {
      id: '3',
      name: 'Enterprise', 
      maxSchools: 25,
      price: 299,
      features: ['Up to 25 Schools', '24/7 Support', 'All Features', 'Custom Integrations']
    }
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Subscription Management
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription plan to control school creation limits
          </p>
        </div>
        
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
                >
                  Select Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}