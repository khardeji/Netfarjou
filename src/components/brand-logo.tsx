import { useState } from 'react';
import { Ticket } from 'lucide-react';

export function BrandLogo() {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span className="inline-flex items-center gap-2 tracking-tight">
        <span className="brand-symbol"><Ticket size={22} /></span>
        <span>NETFARJOU<span className="brand-period">.</span></span>
      </span>
    );
  }

  return (
    <img
      className="site-logo"
      src="/netfarjou-logo.png"
      alt="Netfarjou"
      width={150}
      height={64}
      onError={() => setBroken(true)}
    />
  );
}
