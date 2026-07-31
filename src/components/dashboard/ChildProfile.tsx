import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
export function ChildProfile() {
  return <Card className="glass-card">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Child Profile
        </h2>
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-lg mr-4">
            EJ
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Emma Johnson</h3>
            <p className="text-sm text-slate-500">Age: 4 years</p>
            <p className="text-sm text-slate-500">DOB: 05/12/2019</p>
          </div>
          <a href="#" className="text-amazon-teal text-sm font-medium flex items-center hover:text-amazon-teal/80 transition-colors">
            View full profile <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        </div>
      </CardContent>
    </Card>;
}