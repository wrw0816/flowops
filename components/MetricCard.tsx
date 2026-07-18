import { ReactNode } from "react";

type MetricTone =
  | "default"
  | "positive"
  | "warning"
  | "danger";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: MetricTone;
  progress?: number;
};

export default function MetricCard({
  label,
  value,
  detail,
  tone = "default",
  progress,
}: MetricCardProps) {
  const safeProgress =
    typeof progress === "number"
      ? Math.min(100, Math.max(0, progress))
      : null;

  return (
    <article
      className={`metric-component metric-component-${tone}`}
    >
      <span className="metric-component-label">
        {label}
      </span>

      <strong className="metric-component-value">
        {value}
      </strong>

      {detail ? (
        <small className="metric-component-detail">
          {detail}
        </small>
      ) : null}

      {safeProgress !== null ? (
        <div className="metric-component-progress">
          <div
            className="metric-component-progress-bar"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      ) : null}
    </article>
  );
}