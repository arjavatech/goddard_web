import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
import { ExternalLink } from 'lucide-react';
interface FilloutFormButtonProps {
  formUrl: string;
  formTitle: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  autoOpen?: boolean;
}
export function FilloutFormButton({
  formUrl,
  formTitle,
  variant = 'default',
  size = 'default',
  className = '',
  autoOpen = false
}: FilloutFormButtonProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  return <>
      <Button variant={variant} size={size} className={className} onClick={() => setIsOpen(true)}>
        <ExternalLink className="h-4 w-4 mr-2" />
        {formTitle}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl w-full p-0 h-[90vh]">
          <iframe src={formUrl} title={formTitle} className="w-full h-full border-0" style={{
          minHeight: '80vh'
        }} />
        </DialogContent>
      </Dialog>
    </>;
}