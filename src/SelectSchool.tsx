import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, School as SchoolIcon, MapPin } from 'lucide-react';
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
import { fetchSchools, type School } from '@/services/api/schools';

const SelectSchool = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>('');

  const states = [
   'Washington', 'West Virginia',
  ];

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const schoolsData = await fetchSchools();
        setSchools(schoolsData);
      } catch (error) {
        console.error('Failed to load schools:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSchools();
  }, []);

  const handleSchoolSelect = (school: School) => {
    // Store selected school if needed
    localStorage.setItem('selectedSchool', JSON.stringify(school));
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
              <SchoolIcon className="h-5 w-5 text-amazon-teal" />
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
                    <MapPin className="h-5 w-5 text-amazon-teal" />
                    {selectedState || 'Select State'}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="center" sideOffset={5} className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto" avoidCollisions={false}>
                <DropdownMenuLabel className="text-amazon-teal font-semibold">
                  Select State
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {states.map((state) => (
                  <DropdownMenuItem 
                    key={state}
                    onClick={() => setSelectedState(state)}
                    className="cursor-pointer py-3 hover:bg-amazon-teal/10 focus:bg-amazon-teal/10 hover:text-foreground focus:text-foreground"
                  >
                    <MapPin className="mr-3 h-4 w-4 text-amazon-teal" />
                    {state}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-12 text-base border-2 hover:border-amazon-teal transition-colors"
                  disabled={!selectedState}
                >
                  <span className="flex items-center gap-3">
                    <SchoolIcon className="h-5 w-5 text-amazon-teal" />
                    Select School Location
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="center" sideOffset={5} className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto" avoidCollisions={false}>
                <DropdownMenuLabel className="text-amazon-teal font-semibold">
                  Available Locations
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {loading ? (
                  <DropdownMenuItem disabled className="py-3">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amazon-teal mr-3"></div>
                      Loading schools...
                    </div>
                  </DropdownMenuItem>
                ) : schools.length > 0 ? (
                  schools.map((school) => (
                    <DropdownMenuItem 
                      key={school.id}
                      onClick={() => handleSchoolSelect(school)}
                      className="cursor-pointer py-3 hover:bg-amazon-teal/10 focus:bg-amazon-teal/10 hover:text-foreground focus:text-foreground"
                    >
                      <SchoolIcon className="mr-3 h-4 w-4 text-amazon-teal" />
                      <div>
                        <div className="font-medium">{school.name}</div>
                        {school.location && (
                          <div className="text-sm text-muted-foreground hover:text-foreground/70">{school.location}</div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="py-3">
                    <div className="text-muted-foreground">No schools available</div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {!loading && schools.length === 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  No schools available at the moment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SelectSchool;