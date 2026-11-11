import { Link } from "wouter";
import Navbar from "@/components/Navbar";

// Shown for every unknown address, and for pages the signed-in account may not open (for example /admin for a normal user):
// the same answer in both cases, so nothing reveals that an admin-only page exists.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <main className="pt-28 pb-24 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md text-center" data-testid="not-found">
          <p className="text-sm font-semibold tracking-widest text-primary">404</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Page not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We couldn't find the page you were looking for. It may have moved, or the address may be wrong.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-colors hover:bg-primary/90"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
