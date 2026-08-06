import React, { useState, useEffect } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Input } from './input';
import { COUNTRIES, CountryData } from '../../config/countries';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { cn } from '../../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || !phone.trim()) return true; // Optional by default
  try {
    const parsed = parsePhoneNumberFromString(phone);
    return parsed ? parsed.isValid() : false;
  } catch (e) {
    return false;
  }
};

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function PhoneInput({ value, onChange, onBlur, placeholder = 'Phone number', className, error }: PhoneInputProps) {
  const defaultCountry = COUNTRIES.find(c => c.id === 'US') || COUNTRIES[0];
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(defaultCountry);
  const [localValue, setLocalValue] = useState('');
  const [open, setOpen] = useState(false);

  // Helper to format the number nicely without the trunk prefix (e.g. without the 0 in India/UK)
  const formatWithoutTrunk = (phoneNumber: any) => {
    try {
      const intl = phoneNumber.formatInternational();
      const dialCode = `+${phoneNumber.countryCallingCode}`;
      if (intl.startsWith(dialCode)) {
        return intl.substring(dialCode.length).trim();
      }
      return phoneNumber.formatNational();
    } catch (e) {
      return phoneNumber.formatNational();
    }
  };

  // Sync internal state when external value changes
  useEffect(() => {
    if (!value) {
      setLocalValue('');
      return;
    }

    try {
      const phoneNumber = parsePhoneNumberFromString(value);
      
      if (phoneNumber && phoneNumber.country) {
        const country = COUNTRIES.find(c => c.id === phoneNumber.country);
        if (country) {
          setSelectedCountry(country);
          
          // Avoid overwriting the user's input while typing if it represents the exact same valid number
          try {
             const localParsed = parsePhoneNumberFromString(localValue, country.id as CountryCode);
             if (localParsed && localParsed.format('E.164') === phoneNumber.format('E.164')) {
                return;
             }
          } catch(e) {}

          setLocalValue(formatWithoutTrunk(phoneNumber));
          return;
        }
      }
      
      if (value.startsWith('+')) {
        const matchingCountry = [...COUNTRIES]
          .sort((a, b) => b.dialCode.length - a.dialCode.length)
          .find(c => value.startsWith(c.dialCode));
        if (matchingCountry) {
          setSelectedCountry(matchingCountry);
          setLocalValue(value.substring(matchingCountry.dialCode.length).trim());
          return;
        }
      }

      setLocalValue(value);
    } catch (e) {
      setLocalValue(value);
    }
  }, [value]);

  const handleCountryChange = (countryId: string) => {
    const country = COUNTRIES.find(c => c.id === countryId);
    if (!country) return;
    setSelectedCountry(country);
    if (localValue.trim()) {
      updateParent(country.dialCode, localValue, country.id as CountryCode);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9\s()-]/g, '');
    setLocalValue(val);
    updateParent(selectedCountry.dialCode, val, selectedCountry.id as CountryCode);
  };

  const handleBlur = () => {
    try {
      const phoneNumber = parsePhoneNumberFromString(localValue, selectedCountry.id as CountryCode);
      if (phoneNumber && phoneNumber.isValid()) {
        setLocalValue(formatWithoutTrunk(phoneNumber));
        onChange(phoneNumber.format('E.164'));
      }
    } catch (e) {
      // Ignore
    }
    if (onBlur) onBlur();
  };

  const updateParent = (dialCode: string, nationalNumber: string, countryCode: CountryCode) => {
    if (!nationalNumber.trim()) {
      onChange('');
      return;
    }
    try {
      const phoneNumber = parsePhoneNumberFromString(nationalNumber, countryCode);
      if (phoneNumber && phoneNumber.isValid()) {
        onChange(phoneNumber.format('E.164'));
      } else {
        const rawDigits = nationalNumber.replace(/\D/g, '');
        onChange(`${dialCode}${rawDigits}`);
      }
    } catch (e) {
      const rawDigits = nationalNumber.replace(/\D/g, '');
      onChange(`${dialCode}${rawDigits}`);
    }
  };

  return (
    <div className={cn("flex items-center w-full rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-shadow", error && "border-red-500 focus-within:ring-red-500", className)}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-3 h-10 hover:bg-slate-50 transition-colors focus:outline-none rounded-l-md"
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="text-sm font-medium text-slate-700">{selectedCountry.dialCode}</span>
            <ChevronDown className="h-4 w-4 text-slate-400 opacity-50 ml-1" />
          </button>
        </PopoverPrimitive.Trigger>
        
        <PopoverPrimitive.Content 
          className="z-50 w-[300px] rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          align="start"
          sideOffset={4}
        >
          <Command
            filter={(value, search) => {
              const searchLower = search.toLowerCase().trim();
              if (!searchLower) return 1;
              
              const [name, dialCode, iso] = value.toLowerCase().split(':::');
              if (!name) return 0;
              
              // Exact matches get highest priority (1.0)
              if (name === searchLower || iso === searchLower || dialCode === searchLower) {
                return 1;
              }
              
              // Prefix matches get high priority (0.75)
              if (name.startsWith(searchLower) || dialCode.startsWith(searchLower) || iso.startsWith(searchLower)) {
                return 0.75;
              }
              
              // Substring matches get lowest priority (0.5)
              if (name.includes(searchLower)) {
                return 0.5;
              }
              
              return 0;
            }}
          >
            <CommandInput placeholder="Search country or code..." autoFocus />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.id}
                    value={`${country.name}:::${country.dialCode}:::${country.id}`}
                    onSelect={() => {
                      handleCountryChange(country.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-base leading-none">{country.flag}</span>
                    <span className="text-sm truncate max-w-[160px]">{country.name}</span>
                    <span className="text-xs text-slate-500 ml-auto">{country.dialCode}</span>
                    {selectedCountry.id === country.id && (
                      <Check className="ml-2 h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
      
      <div className="w-px h-5 bg-slate-200 shrink-0" />
      
      <Input
        type="tel"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none rounded-r-md px-3 h-10"
      />
    </div>
  );
}
