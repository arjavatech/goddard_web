import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, School as SchoolIcon, MapPin, ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [selectedSchool, setSelectedSchoolLocal] = useState<School | null>(null);

  const states = ['Washington'];

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const data = await fetchSchools();
        setSchools(data);
      } catch (err) {
        console.error('Failed to load schools:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSchools();
  }, []);

  const handleSchoolSelect = (school: School) => {
    setSelectedSchoolLocal(school);
    localStorage.setItem('selectedSchool', JSON.stringify(school));
  };

  const handleContinue = () => {
    if (selectedSchool) navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Left panel (brand) ── */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-[#0B1F3A] via-[#0F2D52] to-[#0E3A68] p-10 xl:p-14 overflow-hidden">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-10 -left-16 w-72 h-72 rounded-full bg-cyan-500/10" />
        <div className="pointer-events-none absolute top-1/2 right-8 w-40 h-40 rounded-full bg-amber-400/10" />

        {/* Logo */}
        <div className="relative z-10">
          <img
            src="./images/gs_logo_lynnwood.png"
            alt="The Goddard School"
            className="h-10 w-auto object-contain brightness-0 invert opacity-90"
          />
        </div>

        {/* Centre copy */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-cyan-300" />
            </div>
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Welcome to<br />The Goddard School
          </h1>
          <p className="text-sm xl:text-base text-slate-300/80 leading-relaxed max-w-sm">
            Nurturing children through play-based learning and quality early childhood education since 1988.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-3 pt-2">
            {[
              'Manage enrollment forms online',
              'Track your child\'s progress',
              'Secure & private parent portal',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-slate-300/80">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-[11px] text-slate-500">
          © {new Date().getFullYear()} The Goddard School. All rights reserved.
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-slate-50/60">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <img
            src="./images/gs_logo_lynnwood.png"
            alt="The Goddard School"
            className="h-12 w-auto mx-auto mb-3"
          />
        </div>

        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Select your school</h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose your location to access the parent portal.
            </p>
          </div>

          {/* State dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
              State
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-cyan-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-150">
                  <span className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {selectedState || <span className="text-slate-400">Select a state</span>}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-slate-100 shadow-lg bg-white p-1">
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-2 py-1.5">
                  Select State
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                {states.map((state) => (
                  <DropdownMenuItem
                    key={state}
                    onClick={() => setSelectedState(state)}
                    className="rounded-lg cursor-pointer py-2.5 px-3 text-sm font-medium text-slate-700 focus:bg-cyan-50 focus:text-cyan-700 data-[highlighted]:bg-cyan-50 data-[highlighted]:text-cyan-700"
                  >
                    <MapPin className="mr-2.5 h-4 w-4 text-slate-400" />
                    {state}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* School dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
              School Location
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex items-center justify-between h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-cyan-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedState}
                >
                  <span className="flex items-center gap-2.5">
                    <SchoolIcon className="h-4 w-4 text-slate-400" />
                    {selectedSchool
                      ? <span className="text-slate-900">{selectedSchool.name}</span>
                      : <span className="text-slate-400">Select school location</span>
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-slate-100 shadow-lg bg-white p-1 max-h-64 overflow-y-auto">
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-2 py-1.5">
                  Available Locations
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                {loading ? (
                  <DropdownMenuItem disabled className="py-3 text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                      Loading schools…
                    </div>
                  </DropdownMenuItem>
                ) : schools.length > 0 ? (
                  schools.map((school) => (
                    <DropdownMenuItem
                      key={school.id}
                      onClick={() => handleSchoolSelect(school)}
                      className="rounded-lg cursor-pointer py-2.5 px-3 focus:bg-cyan-50 focus:text-cyan-700 data-[highlighted]:bg-cyan-50 data-[highlighted]:text-cyan-700"
                    >
                      <SchoolIcon className="mr-2.5 h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{school.name}</div>
                        {school.location && (
                          <div className="text-xs text-slate-400">{school.location}</div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="py-3 text-sm text-slate-400">
                    No schools available
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Selected school confirmation chip */}
          {selectedSchool && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-50 border border-cyan-100">
              <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center flex-shrink-0">
                <SchoolIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{selectedSchool.name}</p>
                {selectedSchool.location && (
                  <p className="text-xs text-slate-500 truncate">{selectedSchool.location}</p>
                )}
              </div>
            </div>
          )}

          {/* Continue */}
          <Button
            onClick={handleContinue}
            disabled={!selectedSchool}
            className="w-full h-12 text-sm font-semibold rounded-xl bg-[#0891b2] hover:bg-[#0e7490] text-white shadow-sm disabled:opacity-40"
          >
            Continue to Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {!loading && schools.length === 0 && (
            <p className="text-center text-sm text-slate-400">No schools available at the moment.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectSchool;
