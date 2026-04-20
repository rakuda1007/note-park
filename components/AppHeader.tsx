import Link from "next/link";

type Props = {
  end?: React.ReactNode;
};

export default function AppHeader({ end }: Props) {
  return (
    <header className="border-b border-teal-900/30 bg-teal-950/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-teal-950/70">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white hover:text-teal-100"
        >
          Note Park
        </Link>
        {end ? <div className="flex shrink-0 items-center gap-2">{end}</div> : null}
      </div>
    </header>
  );
}
