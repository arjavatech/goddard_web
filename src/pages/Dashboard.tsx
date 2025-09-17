import React, { useEffect, useState, Children } from 'react';
import { Header } from '../components/layout/Header';
import { EnrollmentProgress } from '../components/dashboard/EnrollmentProgress';
import { FormsDocuments } from '../components/dashboard/FormsDocuments';
import { ChildProfile } from '../components/dashboard/ChildProfile';
import { ImportantInfo } from '../components/dashboard/ImportantInfo';
import { QuickActions } from '../components/dashboard/QuickActions';
import { Footer } from '../components/layout/Footer';
import { ChildSelector } from '../components/dashboard/ChildSelector';
import { ChildrenOverview } from '../components/dashboard/ChildrenOverview';
export function Dashboard() {
  // Mock data for multiple children
  const [children, setChildren] = useState([{
    id: '1',
    name: 'Emma Johnson',
    initials: 'EJ',
    age: '4 years',
    dob: '05/12/2019',
    enrollmentProgress: 54,
    formsCompleted: 7,
    totalForms: 13,
    currentStep: 'Agreements'
  }, {
    id: '2',
    name: 'Jacob Johnson',
    initials: 'JJ',
    age: '6 years',
    dob: '03/24/2017',
    enrollmentProgress: 78,
    formsCompleted: 10,
    totalForms: 13,
    currentStep: 'Medical Review'
  }, {
    id: '3',
    name: 'Sophia Johnson',
    initials: 'SJ',
    age: '2 years',
    dob: '11/08/2021',
    enrollmentProgress: 23,
    formsCompleted: 3,
    totalForms: 13,
    currentStep: 'Personal Information'
  }]);
  const [selectedChildId, setSelectedChildId] = useState('1');
  const selectedChild = children.find(child => child.id === selectedChildId) || children[0];
  // Mock data for forms
  const childSpecificForms = [{
    childName: 'Emma Johnson',
    forms: [{
      title: 'Medical & Health Forms',
      description: 'Health history, immunizations, and medical authorizations',
      lastUpdated: 'May 12, 2023',
      status: 'Submitted' as const
    }, {
      title: 'Emergency Contact Information',
      description: 'Contacts for emergencies and authorized pickups',
      lastUpdated: 'May 14, 2023',
      status: 'In Progress' as const
    }]
  }, {
    childName: 'Jacob Johnson',
    forms: [{
      title: 'Medical & Health Forms',
      description: 'Health history, immunizations, and medical authorizations',
      lastUpdated: 'June 2, 2023',
      status: 'Approved' as const
    }, {
      title: 'Emergency Contact Information',
      description: 'Contacts for emergencies and authorized pickups',
      lastUpdated: 'June 3, 2023',
      status: 'Approved' as const
    }]
  }, {
    childName: 'Sophia Johnson',
    forms: [{
      title: 'Medical & Health Forms',
      description: 'Health history, immunizations, and medical authorizations',
      lastUpdated: 'June 15, 2023',
      status: 'Draft' as const
    }, {
      title: 'Emergency Contact Information',
      description: 'Contacts for emergencies and authorized pickups',
      lastUpdated: 'June 15, 2023',
      status: 'Draft' as const
    }]
  }];
  const familyForms = [{
    title: 'Admission Form',
    description: 'Basic information about your family',
    lastUpdated: 'May 10, 2023',
    status: 'Approved' as const
  }, {
    title: 'Parent Handbook Acknowledgment',
    description: "Confirmation that you've read and understood our policies",
    lastUpdated: 'May 15, 2023',
    status: 'Needs Revision' as const
  }, {
    title: 'Enrollment Agreement',
    description: 'Terms and conditions for enrollment',
    lastUpdated: 'May 16, 2023',
    status: 'Draft' as const
  }];
  return <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <ChildSelector children={children} selectedChildId={selectedChildId} onSelectChild={setSelectedChildId} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="section-fade-in" style={{
            animationDelay: '0.1s'
          }}>
              <EnrollmentProgress childName={selectedChild.name} completedSteps={selectedChild.formsCompleted} totalSteps={selectedChild.totalForms} currentStep={selectedChild.currentStep} />
            </div>
            <div className="section-fade-in" style={{
            animationDelay: '0.2s'
          }}>
              <FormsDocuments childSpecificForms={childSpecificForms} familyForms={familyForms} />
            </div>
          </div>
          <div className="space-y-6">
            <div className="section-fade-in" style={{
            animationDelay: '0.3s'
          }}>
              <QuickActions />
            </div>
            <div className="section-fade-in" style={{
            animationDelay: '0.4s'
          }}>
              <ChildrenOverview children={children} selectedChildId={selectedChildId} onSelectChild={setSelectedChildId} />
            </div>
            <div className="section-fade-in" style={{
            animationDelay: '0.5s'
          }}>
              <ImportantInfo />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>;
}