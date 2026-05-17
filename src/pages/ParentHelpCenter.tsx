import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { HelpCenterContent } from '../components/HelpCenterContent';

export function ParentHelpCenter() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <HelpCenterContent role="parent" />
      </main>
      <Footer />
    </div>
  );
}
