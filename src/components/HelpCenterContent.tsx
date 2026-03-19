import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  HelpCircle, Mail, Phone, BookOpen, MessageSquare, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, Send, CheckCircle
} from 'lucide-react';

const adminFaqs = [
  {
    category: 'Account & Access',
    items: [
      { q: 'How do I invite a new parent?', a: 'Go to Parents → click "Invite Parent" → fill in the parent and child details → submit. The parent will receive an email with a link to set up their account.' },
      { q: 'A parent never received their invite email. What should I do?', a: 'Go to Parents → find the parent → click ⋯ → "Resend Confirmation". This will resend the signup email.' },
      { q: 'How do I deactivate a parent account?', a: 'Go to Parents → find the parent → click ⋯ → "Deactivate". The parent will no longer be able to log in.' },
    ],
  },
  {
    category: 'Forms & Documents',
    items: [
      { q: 'How do I assign a form to a student?', a: 'Go to Student Management → find the student → click ⋯ → "Manage Forms" → select forms → click "Assign Forms".' },
      { q: 'How do I assign a form to all students at once?', a: 'Go to Forms Management → find the form → click "Assign to All Students".' },
      { q: 'How do I download all forms for a student?', a: 'Go to Student Management → find the student → click ⋯ → "Download All Forms". This downloads a ZIP file.' },
      { q: 'What does "Pending Approval" mean?', a: 'The parent submitted the form but it has not yet been reviewed and approved by an admin.' },
      { q: 'How do I send a reminder about an overdue form?', a: 'Go to Due Forms → find the form row → click "Remind". Use the bulk Remind dropdown to send reminders to all overdue or pending forms at once.' },
    ],
  },
  {
    category: 'Classrooms & Students',
    items: [
      { q: 'How do I transfer a student to a different classroom?', a: 'Go to Student Management → find the student → click ⋯ → "Transfer Class" → select the new classroom → confirm.' },
      { q: 'How do I archive a student?', a: 'Go to Student Management → click the green "Active" pill → change to "Archive" → confirm.' },
      { q: 'How do I bulk transfer multiple students?', a: 'Check the checkboxes next to the students → click "Transfer Selected" → choose the target classroom → confirm.' },
    ],
  },
  {
    category: 'Exports & Reports',
    items: [
      { q: 'How do I export the student list?', a: 'Go to Student Management → click "Export" → choose CSV or PDF.' },
      { q: 'How do I export the due forms report?', a: 'Go to Due Forms → apply filters → click "Export" → choose CSV or PDF.' },
    ],
  },
];

const parentFaqs = [
  {
    category: 'Getting Started',
    items: [
      { q: 'How do I access my dashboard?', a: 'After logging in, you will be taken directly to your parent dashboard where you can see all your children\'s enrollment progress.' },
      { q: 'I forgot my password. How do I reset it?', a: 'On the login page, click "Forgot Password" → enter your email → check your inbox for a reset link.' },
      { q: 'How do I update my account information?', a: 'Contact your school administrator to update your account details such as email or name.' },
    ],
  },
  {
    category: 'Forms & Enrollment',
    items: [
      { q: 'How do I complete a form?', a: 'Go to your dashboard → scroll to Forms & Documents → click on a form card → fill in the form and submit.' },
      { q: 'Can I download my completed forms?', a: 'Yes. In Forms & Documents, approved forms show a Download (↓) button. You can also click "Download All" to get a ZIP of all approved forms.' },
      { q: 'What does each form status mean?', a: 'Draft = started but not submitted. Pending = assigned but not started. Pending Approval = submitted, waiting for admin review. Approved = reviewed and accepted by admin.' },
      { q: 'I submitted a form but it still shows as pending. Is that normal?', a: 'Yes. After you submit, the form moves to "Pending Approval" while the school admin reviews it. Once approved it will show as "Approved".' },
      { q: 'Can I edit a form after submitting it?', a: 'Once submitted, forms cannot be edited unless the admin sends it back for revision. Contact your school if you need to make changes.' },
    ],
  },
  {
    category: 'Children & Progress',
    items: [
      { q: 'How do I switch between my children on the dashboard?', a: 'Use the child selector dropdown at the top of the dashboard to switch between children.' },
      { q: 'What does the enrollment progress percentage mean?', a: 'It shows how many of the required forms have been completed out of the total assigned forms.' },
      { q: 'Why are some forms disabled for my child?', a: 'If your child is archived, forms are disabled. Contact your school administrator for more information.' },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center justify-between py-3 text-left gap-4 hover:text-amazon-teal transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-amazon-teal" />
          : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
      </button>
      {open && <p className="pb-3 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

interface HelpCenterContentProps {
  role: 'admin' | 'parent';
}

export function HelpCenterContent({ role }: HelpCenterContentProps) {
  const faqs = role === 'admin' ? adminFaqs : parentFaqs;
  const navigate = useNavigate();
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
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 max-w-4xl">

      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amazon-teal/10 rounded-lg">
          <HelpCircle className="h-6 w-6 text-amazon-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
          <p className="text-sm text-muted-foreground">
            {role === 'admin' ? 'Find answers to common admin questions' : 'Find answers to common questions about your enrollment'}
          </p>
        </div>
      </div>

      {/* Contact cards */}
      <div className={`grid grid-cols-1 gap-4 ${role === 'admin' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <a href="mailto:support@goddardschool.com" className="group">
          <Card className="glass-card h-full hover:border-amazon-teal/40 transition-colors">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-amazon-teal/10 rounded-full group-hover:bg-amazon-teal/20 transition-colors">
                <Mail className="h-5 w-5 text-amazon-teal" />
              </div>
              <p className="text-sm font-medium text-foreground">Email Support</p>
              <p className="text-xs text-muted-foreground">support@goddardschool.com</p>
            </CardContent>
          </Card>
        </a>
        <a href="tel:+18000000000" className="group">
          <Card className="glass-card h-full hover:border-amazon-teal/40 transition-colors">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-amazon-teal/10 rounded-full group-hover:bg-amazon-teal/20 transition-colors">
                <Phone className="h-5 w-5 text-amazon-teal" />
              </div>
              <p className="text-sm font-medium text-foreground">Phone Support</p>
              <p className="text-xs text-muted-foreground">+1 (800) 000-0000</p>
            </CardContent>
          </Card>
        </a>
        {role === 'admin' && (
          <Link to="/admin/guide" className="group">
            <Card className="glass-card h-full hover:border-amazon-teal/40 transition-colors">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="p-2 bg-amazon-teal/10 rounded-full group-hover:bg-amazon-teal/20 transition-colors">
                  <BookOpen className="h-5 w-5 text-amazon-teal" />
                </div>
                <p className="text-sm font-medium text-foreground">Admin Guide</p>
                <p className="text-xs text-muted-foreground">Step-by-step feature guide</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* FAQs */}
      {faqs.map(category => (
        <Card key={category.category} className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amazon-teal" />
              {category.category}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {category.items.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Message form */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-amazon-teal" />
            Send Us a Message
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="h-10 w-10 text-amazon-teal" />
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
                <Textarea placeholder="Describe your issue or question..." rows={4} value={msgBody} onChange={e => setMsgBody(e.target.value)} required />
              </div>
              <Button type="submit" className="bg-amazon-teal hover:bg-amazon-teal/90 gap-2">
                <Send className="h-4 w-4" />
                Send Message
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Still need help */}
      <Card className="glass-card bg-amazon-teal/5 border-amazon-teal/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amazon-teal flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Still need help?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Email us at{' '}
              <a href="mailto:support@goddardschool.com" className="text-amazon-teal hover:underline">
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
