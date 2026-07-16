import { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="topbar">
      <div>
        {eyebrow ? (
          <p className="eyebrow">{eyebrow}</p>
        ) : null}

        <h1>{title}</h1>

        {description ? (
          <p className="page-description">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="topbar-actions">
          {actions}
        </div>
      ) : null}
    </header>
  );
}