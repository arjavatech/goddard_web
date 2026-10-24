import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { SuperAdminGuideContent } from './SuperAdminGuideContent';
import { useUserContext } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { submitHelpMessage } from '../services/api/helpCenter';
import { Mail, Phone, BookOpen, Send, CheckCircle } from 'lucide-react';

interface HelpCenterContentProps {
  role: 'admin' | 'parent' | 'employee';
  onClose?: () => void;
}

export function HelpCenterContent({ role: _role, onClose }: HelpCenterContentProps) {
  const { schoolPhone, schoolEmail, userData } = useUserContext();
  const { showToast } = useToast();
  const [guideOpen, setGuideOpen] = useState(false);
  const [msgName, setMsgName] = useState(
    userData ? `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim() : ''
  );
  const [msgEmail, setMsgEmail] = useState(userData?.email ?? '');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitHelpMessage({
        sender_name: msgName,
        sender_email: msgEmail,
        subject: msgSubject,
        message: msgBody,
      });
      setSubmitted(true);
      setMsgSubject('');
      setMsgBody('');
    } catch {
      showToast('error', 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Contact chips — only shown when school has email/phone */}
      {(schoolEmail || schoolPhone) && (
        <div className="grid grid-cols-2 gap-3">
          {schoolEmail && (
            <a href={`mailto:${schoolEmail}`} className="group">
              <Card className="glass-card h-full hover:border-amazon-teal/40 transition-colors">
                <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                  <div className="p-1.5 bg-amazon-teal/10 rounded-full group-hover:bg-amazon-teal/20 transition-colors">
                    <Mail className="h-4 w-4 text-amazon-teal" />
                  </div>
                  <p className="text-xs font-medium text-foreground">Email Support</p>
                  <p className="text-[10px] text-muted-foreground break-all">{schoolEmail}</p>
                </CardContent>
              </Card>
            </a>
          )}
          {schoolPhone && (
            <a href={`tel:${schoolPhone}`} className="group">
              <Card className="glass-card h-full hover:border-amazon-teal/40 transition-colors">
                <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                  <div className="p-1.5 bg-amazon-teal/10 rounded-full group-hover:bg-amazon-teal/20 transition-colors">
                    <Phone className="h-4 w-4 text-amazon-teal" />
                  </div>
                  <p className="text-xs font-medium text-foreground">Phone Support</p>
                  <p className="text-[10px] text-muted-foreground">{schoolPhone}</p>
                </CardContent>
              </Card>
            </a>
          )}
        </div>
      )}

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amazon-teal" />
              Admin Guide
            </DialogTitle>
          </DialogHeader>
          <SuperAdminGuideContent />
        </DialogContent>
      </Dialog>

      {/* Message form — flat, no card wrapper */}
      <div className="flex items-center gap-2 mb-1">
        <Send className="h-3.5 w-3.5 text-amazon-teal flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground">Send Us a Message</span>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle className="h-9 w-9 text-amazon-teal" />
          <p className="text-sm font-medium text-foreground">Message sent!</p>
          <p className="text-xs text-muted-foreground">We'll get back to you within one business day.</p>
          <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setMsgSubject(''); setMsgBody(''); }}>
            Send another
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input placeholder="Your name" value={msgName} onChange={e => setMsgName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input type="email" placeholder="your@email.com" value={msgEmail} onChange={e => setMsgEmail(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Input placeholder="How can we help?" value={msgSubject} onChange={e => setMsgSubject(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Message</label>
            <Textarea placeholder="Describe your issue or question..." rows={3} value={msgBody} onChange={e => setMsgBody(e.target.value)} required />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={isSubmitting} className="h-10 px-5 bg-amazon-teal hover:bg-amazon-teal/90 text-white gap-2 text-sm font-semibold">
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5 rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] text-sm font-semibold">
                Close
              </Button>
            )}
          </div>
        </form>
      )}

    </div>
  );
}
