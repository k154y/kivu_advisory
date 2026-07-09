"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getDashboardPathByRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/staff", label: "Staff" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const dashboardHref = user ? getDashboardPathByRole(user.role) : "/login";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-200",
        scrolled
          ? "border-b border-gray-100 bg-softwhite/95 shadow-sm backdrop-blur-sm"
          : "bg-softwhite",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-[72px]">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold tracking-tight text-navy">
              Kivu Advisory
            </span>
            <span className="mb-3 ml-1 h-1.5 w-1.5 rounded-full bg-gold" />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors duration-150",
                    active ? "text-navy" : "text-gray-600 hover:text-navy",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {!isLoading && user ? (
              <>
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-navy"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-red-600"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-navy"
              >
                Log In
              </Link>
            )}

            <Link
              href="/request-service"
              className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-700"
            >
              Request a Service
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-50 hover:text-navy lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-gray-100 bg-softwhite lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            {navLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-navy-50 text-navy"
                      : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="space-y-2 border-t border-gray-100 pt-3">
              {!isLoading && user ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 px-4 py-2.5 text-center text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Log In
                </Link>
              )}

              <Link
                href="/request-service"
                className="block w-full rounded-lg bg-navy px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-navy-700"
              >
                Request a Service
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}