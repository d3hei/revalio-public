import type { ReactNode } from "react";

interface Props {
  label: ReactNode;
  iconUrl?: string | null;
  className?: string;
  title?: string;
  trailing?: ReactNode;
}

export function TokenSymbolLine({ label, iconUrl, className = "token-type", title, trailing }: Props) {
  return (
    <div className={className} title={title}>
      {iconUrl ? <img className="token-coin-icon" src={iconUrl} alt="" width={18} height={18} /> : null}
      <span>{label}</span>
      {trailing}
    </div>
  );
}
