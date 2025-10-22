import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SelectSchool = () => {
  const navigate = useNavigate();

  const handleSchoolSelect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <img 
            src="./images/gs_logo_lynnwood.png" 
            alt="Goddard School Logo" 
            className="h-16 w-auto mx-auto mb-4" 
          />
          <h1 className="text-3xl font-bold text-primary mb-2">Welcome to Goddard School</h1>
          <p className="text-muted-foreground">Select your school location to continue</p>
        </div>

        {/* School Selection Card */}
        <Card className="glass-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-primary flex items-center justify-center gap-2">
              <School className="h-5 w-5 text-amazon-teal" />
              Choose Your School
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-12 text-base border-2 hover:border-amazon-teal transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <School className="h-5 w-5 text-amazon-teal" />
                    Select School Location
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuLabel className="text-amazon-teal font-semibold">
                  Available Locations
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSchoolSelect}
                  className="cursor-pointer py-3 hover:bg-amazon-teal/10 focus:bg-amazon-teal/10 hover:text-foreground focus:text-foreground"
                >
                  <School className="mr-3 h-4 w-4 text-amazon-teal" />
                  <div>
                    <div className="font-medium">Goddard School - Lynnwood</div>
                    <div className="text-sm text-muted-foreground hover:text-foreground/70">Main Campus</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                More locations coming soon...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SelectSchool;