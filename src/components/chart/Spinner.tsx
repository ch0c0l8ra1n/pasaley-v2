interface LoadingSpinnerProps {
    className?: string;
}

const LoadingSpinner = ({ className } : LoadingSpinnerProps) => (
  <svg
    id="loading-spinner"
    width="24"
    stroke="rgba(var(--chart-1-rgb),0.7)"
    height="24"
    viewBox='0 0 24 24'
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    className={"animate-spin font-bold" + " " + className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

interface SpinnerProps {
    className?: string;
}

export function Spinner(props: SpinnerProps) {
    const { className } = props;
  return (
    <span className={className}>
      <LoadingSpinner className="w-16 h-16" />
    </span>
  );
}
