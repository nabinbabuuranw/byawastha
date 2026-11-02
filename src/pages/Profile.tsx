import { UserProfile } from '@clerk/clerk-react';
import { useParams } from 'react-router-dom';
import { PageHead } from '../components/ui';
import { clerkAppearance } from './Auth';
export default function Profile() {
  const { org } = useParams();
  return <div><PageHead eyebrow="Account" title="Your profile" desc="Name, email addresses, password, connected Google account and active sessions. Managed by Clerk; changes apply to every workspace you're in." />
    <div className="overflow-x-auto"><UserProfile routing="path" path={`/app/${org}/profile`} appearance={clerkAppearance()} /></div></div>;
}
