import { useLoginVariant } from '../portal/useLoginVariant';
import PortalLoginShell from '../portal/PortalLoginShell';
import { clientVariants, type ClientVariantKey } from './client/variants';

const KEYS = Object.keys(clientVariants) as ClientVariantKey[];

export default function LoginClient() {
  const variant = useLoginVariant(KEYS);
  return <PortalLoginShell content={clientVariants[variant]} />;
}
