import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { PhotosLibrary } from '@/components/ClientPortal/Photos/PhotosLibrary';

export default function ClientPortalPhotos() {
  useClientPortalPageTitle({ page: 'photos' });
  return <PhotosLibrary />;
}
