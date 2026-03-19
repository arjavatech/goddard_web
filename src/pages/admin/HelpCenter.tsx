import { AdminLayout } from './AdminLayout';
import { HelpCenterContent } from '../../components/HelpCenterContent';

export function HelpCenter() {
  return (
    <AdminLayout>
      <HelpCenterContent role="admin" />
    </AdminLayout>
  );
}
