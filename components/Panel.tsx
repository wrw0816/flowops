import type {
  ElementType,
  ReactNode,
} from "react";

type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headingClassName?: string;
  as?: ElementType;
};

export default function Panel({
  title,
  description,
  actions,
  children,
  className = "",
  headingClassName = "",
  as: Component = "section",
}: PanelProps) {
  const panelClassName = [
    "panel",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const panelHeadingClassName = [
    "panel-heading",
    headingClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeading =
    Boolean(title) ||
    Boolean(description) ||
    Boolean(actions);

  return (
    <Component className={panelClassName}>
      {hasHeading ? (
        <div className={panelHeadingClassName}>
          <div>
            {title ? <h2>{title}</h2> : null}

            {description ? (
              <p>{description}</p>
            ) : null}
          </div>

          {actions ? actions : null}
        </div>
      ) : null}

      {children}
    </Component>
  );
}