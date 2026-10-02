// Shared inline-SVG icon set. No external icon dependency.
// Every icon accepts an optional `className` (defaults to a 20px square) and
// `strokeWidth`, and inherits `currentColor` so it can be colored by the
// surrounding text tone.

export type IconProps = {
  className?: string;
  strokeWidth?: number;
};

function Icon({
  className = "h-5 w-5",
  strokeWidth = 1.8,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Modules                                                             */
/* ------------------------------------------------------------------ */

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </Icon>
  );
}

export function FieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 21c0-8 5-13 14-14 0 9-5 14-14 14z" />
      <path d="M5 21c3-5 7-9 12-12" />
    </Icon>
  );
}

export function ProductionIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 12h6m-6 3h6m2.25-9.75h.008v.008h-.008V5.25zm0 0H15a3 3 0 01-3 3H9a3 3 0 01-3-3H4.5A2.25 2.25 0 002.25 7.5v10.5A2.25 2.25 0 004.5 20.25h15a2.25 2.25 0 002.25-2.25V7.5A2.25 2.25 0 0019.5 5.25h-1.5z" />
    </Icon>
  );
}

export function InputsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M8.25 3.75h7.5l1.5 3.75h-10.5l1.5-3.75z" />
    </Icon>
  );
}

export function FinanceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.75 7.5A2.25 2.25 0 016 5.25h10.5A2.25 2.25 0 0118.75 7.5v.75m-15 0v8.25A2.25 2.25 0 006 18.75h12a2.25 2.25 0 002.25-2.25v-6A2.25 2.25 0 0018 8.25H3.75m12.75 3.75h.008v.008H16.5v-.008z" />
    </Icon>
  );
}

export function LivestockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 8.25A2.25 2.25 0 017.75 6c.6 0 1.15.24 1.56.63A6.3 6.3 0 0112 6.12c.95 0 1.85.18 2.69.5A2.24 2.24 0 0116.25 6a2.25 2.25 0 012.25 2.25c0 .82-.44 1.54-1.1 1.94.19.5.3 1.05.3 1.62 0 3.6-2.77 6.19-5.7 6.19S5.3 15.41 5.3 11.81c0-.57.1-1.12.3-1.62-.66-.4-1.1-1.12-1.1-1.94z" />
      <path d="M9.75 11.25h.008v.008H9.75v-.008zM14.25 11.25h.008v.008h-.008v-.008z" />
      <path d="M10.5 14.25h3" />
    </Icon>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </Icon>
  );
}

export function MachineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.25 9V6.75h4.5l1.5 3.75h2.25v3" />
      <path d="M4.5 16.5a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM13.5 16.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
      <path d="M6.75 16.5H2.25V9A2.25 2.25 0 014.5 6.75h1.5M16.5 16.5h.75a2.25 2.25 0 002.25-2.25v-2.4a2.25 2.25 0 00-.53-1.44l-1.22-1.46" />
    </Icon>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </Icon>
  );
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.75l6 6 9-13.5" />
    </Icon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 18L18 6M6 6l12 12" />
    </Icon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </Icon>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16.023 9.348h4.992V4.356m-4.992 4.992A8.25 8.25 0 004.031 9.865M16.023 9.348l-3.181-3.183M2.985 19.644v-4.992m0 0h4.992m-4.992 0a8.25 8.25 0 0013.803 3.7l3.181 3.183" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </Icon>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </Icon>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v17.25m-4.185-2.4c1.303-.485 2.713-.75 4.185-.75s2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-13.5 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </Icon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </Icon>
  );
}

export function MapZoomIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      <path d="M16.5 16.5l2.25 2.25M15 15a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0z" />
    </Icon>
  );
}

/* ------------------------------------------------------------------ */
/* Landing additions                                                   */
/* ------------------------------------------------------------------ */

export function ClipboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4.5h6a1.5 1.5 0 011.5 1.5A1.5 1.5 0 0115 7.5H9A1.5 1.5 0 017.5 6 1.5 1.5 0 019 4.5z" />
      <path d="M16.5 6h.75A2.25 2.25 0 0119.5 8.25v9a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-9A2.25 2.25 0 016.75 6h.75" />
      <path d="M8.25 11.25h7.5M8.25 14.25h7.5M8.25 17.25h4.5" />
    </Icon>
  );
}

export function CloudOfflineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M22.61 16.95A5 5 0 0018 10h-1.26a8 8 0 00-7.05-6M5 5a8 8 0 004 15h9a5 5 0 001.7-.3" />
      <path d="M2 2l20 20" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.25l7.5 3v5.25c0 4.97-3.2 8.86-7.5 10.5-4.3-1.64-7.5-5.53-7.5-10.5V5.25l7.5-3z" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3v16.5A1.5 1.5 0 004.5 21H21" />
      <path d="M7.5 16.5v-5.25M12 16.5V7.5M16.5 16.5v-8.25M21 16.5V5.25" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12h15m0 0l-6-6m6 6l-6 6" />
    </Icon>
  );
}
