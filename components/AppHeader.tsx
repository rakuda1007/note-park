import Link from "next/link";

type Props = {
  end?: React.ReactNode;
  showPortalLink?: boolean;
};

export default function AppHeader({ end, showPortalLink = false }: Props) {
  return (
    <header className="border-b border-teal-900/30 bg-teal-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur supports-[backdrop-filter]:bg-teal-950/70">
      <div className="mx-auto flex min-w-0 max-w-lg items-center justify-between gap-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white hover:text-teal-100"
        >
          Note Park
        </Link>
        {(end ?? showPortalLink) ? (
          <div className="flex shrink-0 items-center gap-2">
            {end}
            {showPortalLink ? (
              <Link
                href="/portal"
                title="Note Park ポータル"
                aria-label="Note Park ポータル"
                className="rounded px-1.5 py-0.5 text-sm font-semibold text-teal-200/90 hover:bg-teal-900/50 hover:text-teal-100"
              >
                ?
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
