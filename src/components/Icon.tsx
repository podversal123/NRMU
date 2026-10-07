const paths: Record<string, React.ReactNode> = {
  doc: (<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>),
  rupee: (<><path d="M7 5h10M7 9h10M7 5c5 0 7 2 7 4s-2 4-7 4l7 7" /></>),
  shield: (<><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>),
  building: (<><path d="M4 21V9l8-5 8 5v12M9 21v-6h6v6M4 21h16" /></>),
  people: (<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 1.5 6 5.5" /></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>),
  arrow: (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
  pdf: (<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>),
};

export default function Icon({ name, size = 22, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
