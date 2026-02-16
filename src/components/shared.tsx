"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";

// Support email
export const SUPPORT_EMAIL = "support@erao.digital";

// Email button that redirects to contact page
export const EmailButton = ({
  className = "",
  variant = "primary",
  children,
}: {
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  children: React.ReactNode;
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all";
  const variantStyles = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-white text-black hover:bg-gray-100",
    outline: "border border-gray-300 hover:bg-gray-50",
  };

  return (
    <Link
      href="/contact"
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
};

// Logo icon component
export const LogoIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <>
    <Image
      src="/logo-dark.png"
      alt="Erao Logo"
      width={200}
      height={200}
      quality={100}
      priority
      className={`${className} dark:hidden`}
    />
    <Image
      src="/logo.png"
      alt="Erao Logo"
      width={200}
      height={200}
      quality={100}
      priority
      className={`${className} hidden dark:block`}
    />
  </>
);

// Navigation dropdown data
const navDropdowns = {
  product: {
    label: "Product",
    items: [
      { href: "/features", label: "Features", desc: "See what Erao can do" },
      { href: "/pricing", label: "Pricing", desc: "Plans for every team" },
    ],
  },
  resources: {
    label: "Resources",
    items: [
      { href: "/help", label: "Help Center", desc: "Guides and tutorials" },
      { href: "/security", label: "Security", desc: "How we protect your data" },
    ],
  },
  company: {
    label: "Company",
    items: [
      { href: "/about", label: "About", desc: "Our story and mission" },
      { href: "/contact", label: "Contact", desc: "Get in touch" },
    ],
  },
  legal: {
    label: "Legal",
    items: [
      { href: "/privacy", label: "Privacy Policy", desc: "How we handle your data" },
      { href: "/terms", label: "Terms of Service", desc: "Rules of using Erao" },
    ],
  },
};

// Dropdown component for desktop
const NavDropdown = ({
  label,
  items,
  isOpen,
  onMouseEnter,
  onMouseLeave
}: {
  label: string;
  items: { href: string; label: string; desc: string }[];
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => (
  <div
    className="relative"
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-black transition-colors py-2">
      {label}
      <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && (
      <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="text-sm font-medium text-gray-900">{item.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
          </Link>
        ))}
      </div>
    )}
  </div>
);

// Mobile menu accordion item
const MobileAccordion = ({
  label,
  items,
  isOpen,
  onToggle,
  onLinkClick,
}: {
  label: string;
  items: { href: string; label: string; desc: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onLinkClick: () => void;
}) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 text-left"
    >
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <svg
        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && (
      <div className="pb-2 pl-3 space-y-0.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className="block py-1.5 text-sm text-gray-500 hover:text-black transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    )}
  </div>
);

// Consistent navigation bar with dropdowns and mobile menu
export const Navbar = ({ currentPage }: { currentPage?: string }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
        setMobileAccordion(null);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleMouseEnter = (dropdown: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpenDropdown(dropdown);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileAccordion(null);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 px-5 sm:px-6 flex items-center justify-between z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon className="w-8 h-8 sm:w-10 sm:h-10" />
          <span className="font-semibold text-base sm:text-lg">Erao</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <NavDropdown
            label={navDropdowns.product.label}
            items={navDropdowns.product.items}
            isOpen={openDropdown === 'product'}
            onMouseEnter={() => handleMouseEnter('product')}
            onMouseLeave={handleMouseLeave}
          />
          <NavDropdown
            label={navDropdowns.resources.label}
            items={navDropdowns.resources.items}
            isOpen={openDropdown === 'resources'}
            onMouseEnter={() => handleMouseEnter('resources')}
            onMouseLeave={handleMouseLeave}
          />
          <NavDropdown
            label={navDropdowns.company.label}
            items={navDropdowns.company.items}
            isOpen={openDropdown === 'company'}
            onMouseEnter={() => handleMouseEnter('company')}
            onMouseLeave={handleMouseLeave}
          />
          <NavDropdown
            label={navDropdowns.legal.label}
            items={navDropdowns.legal.items}
            isOpen={openDropdown === 'legal'}
            onMouseEnter={() => handleMouseEnter('legal')}
            onMouseLeave={handleMouseLeave}
          />
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-black transition-colors px-3 py-2"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Start Free
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 -mr-1.5 text-gray-500 hover:text-black transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            </svg>
          )}
        </button>
      </nav>
      <div className="h-14" />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-14 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/10"
            onClick={closeMobileMenu}
          />

          {/* Menu Panel */}
          <div className="absolute top-0 left-0 right-0 bg-white shadow-sm max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
            <div className="px-5 py-1">
              {/* Navigation Accordions */}
              <MobileAccordion
                label={navDropdowns.product.label}
                items={navDropdowns.product.items}
                isOpen={mobileAccordion === 'product'}
                onToggle={() => setMobileAccordion(mobileAccordion === 'product' ? null : 'product')}
                onLinkClick={closeMobileMenu}
              />
              <MobileAccordion
                label={navDropdowns.resources.label}
                items={navDropdowns.resources.items}
                isOpen={mobileAccordion === 'resources'}
                onToggle={() => setMobileAccordion(mobileAccordion === 'resources' ? null : 'resources')}
                onLinkClick={closeMobileMenu}
              />
              <MobileAccordion
                label={navDropdowns.company.label}
                items={navDropdowns.company.items}
                isOpen={mobileAccordion === 'company'}
                onToggle={() => setMobileAccordion(mobileAccordion === 'company' ? null : 'company')}
                onLinkClick={closeMobileMenu}
              />
              <MobileAccordion
                label={navDropdowns.legal.label}
                items={navDropdowns.legal.items}
                isOpen={mobileAccordion === 'legal'}
                onToggle={() => setMobileAccordion(mobileAccordion === 'legal' ? null : 'legal')}
                onLinkClick={closeMobileMenu}
              />

              {/* Auth Buttons */}
              <div className="pt-3 mt-1 border-t border-gray-100 flex items-center gap-3 pb-4">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="flex-1 text-center py-2.5 text-sm text-gray-600 hover:text-black transition-colors font-medium border border-gray-200 rounded-lg"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="flex-1 text-center bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Start Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Comprehensive footer with all links
export const Footer = () => (
  <footer className="w-full border-t border-gray-200 bg-white">
    <div className="max-w-5xl mx-auto px-6 py-10 sm:py-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 mb-10 sm:mb-12">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-3 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5 mb-4">
            <LogoIcon className="w-10 h-10 sm:w-12 sm:h-12" />
            <span className="font-semibold text-lg sm:text-xl">Erao</span>
          </Link>
          <p className="text-sm text-gray-500">
            AI-powered database intelligence.
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="font-semibold text-sm mb-3 sm:mb-4">Product</h4>
          <ul className="space-y-2 sm:space-y-3 text-sm text-gray-500">
            <li><Link href="/features" className="hover:text-black transition-colors">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="font-semibold text-sm mb-3 sm:mb-4">Resources</h4>
          <ul className="space-y-2 sm:space-y-3 text-sm text-gray-500">
            <li><Link href="/help" className="hover:text-black transition-colors">Help Center</Link></li>
            <li><Link href="/security" className="hover:text-black transition-colors">Security</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-semibold text-sm mb-3 sm:mb-4">Company</h4>
          <ul className="space-y-2 sm:space-y-3 text-sm text-gray-500">
            <li><Link href="/about" className="hover:text-black transition-colors">About</Link></li>
            <li><Link href="/contact" className="hover:text-black transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-sm mb-3 sm:mb-4">Legal</h4>
          <ul className="space-y-2 sm:space-y-3 text-sm text-gray-500">
            <li><Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-black transition-colors">Terms</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="pt-6 sm:pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-400 text-center sm:text-left">© 2025 Erao. All rights reserved.</p>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  </footer>
);

// Page wrapper for consistent layout
export const PageLayout = ({
  children,
  currentPage
}: {
  children: React.ReactNode;
  currentPage?: string;
}) => (
  <div className="min-h-screen bg-white text-gray-900 flex flex-col">
    <Navbar currentPage={currentPage} />
    <main className="flex-1">
      {children}
    </main>
    <Footer />
  </div>
);
