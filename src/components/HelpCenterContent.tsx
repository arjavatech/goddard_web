import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { SuperAdminGuideContent } from './SuperAdminGuideContent';
import {
  HelpCircle, Mail, Phone, BookOpen, MessageSquare, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, Send, CheckCircle
} from 'lucide-react';

interface HelpCenterContentProps {
  role: 'admin' | 'parent';
}

export function HelpCenterContent({ role }: HelpCenterContentProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [msgName, setMsgName] = useState('');
  const [msgEmail, setMsgEmail] = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setMsgName(''); setMsgEmail(''); setMsgSubject(''); setMsgBody('');
  };

  return (
    <div className="px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">

      {/* Contact cards */}
      <div className={`grid grid-cols-2 gap-3 ${role === 'admin' ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
        <a href="mailto:support@goddardschool.com" className="group">
          <Card className="glass-card h-full hover:border-amazon-teal/40 transition-colors">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 bg-amazon-teal/10 rounded-full group-hover:bg-amazon-teal/20 transition-colors">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-amazon-teal" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-foreground">Email Support</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground break-all">support@goddardschool.com</p>
            </CardContent>
          </Card>
        </a>
        <a href="tel:+18000000000" className="group">
          <Card className="glass-card h-full hover:border-amazon-teal/40 transition-colors">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 bg-amazon-teal/10 rounded-full group-hover:bg-amazon-teal/20 transition-colors">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-amazon-teal" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-foreground">Phone Support</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">+1 (800) 000-0000</p>
            </CardContent>
          </Card>
        </a>
        
      </div>

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

      {/* Message form */}
      <Card className="glass-card">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-amazon-teal" />
            Send Us a Message
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-6">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-amazon-teal" />
              <p className="text-sm font-medium text-foreground">Message sent!</p>
              <p className="text-xs text-muted-foreground">We'll get back to you within one business day.</p>
              <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>Send another</Button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-3 pt-2">
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
              <Button type="submit" size="sm" className="bg-amazon-teal hover:bg-amazon-teal/90 gap-2 w-full sm:w-auto">
                <Send className="h-3.5 w-3.5" />
                Send Message
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Still need help */}
      <Card className="glass-card bg-amazon-teal/5 border-amazon-teal/20">
        <CardContent className="p-3 sm:p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amazon-teal flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-medium text-foreground">Still need help?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Email us at{' '}
              <a href="mailto:support@goddardschool.com" className="text-amazon-teal hover:underline break-all">
                support@goddardschool.com
              </a>{' '}
              or call{' '}
              <a href="tel:+18000000000" className="text-amazon-teal hover:underline">+1 (800) 000-0000</a>.
              We'll get back to you within one business day.
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
