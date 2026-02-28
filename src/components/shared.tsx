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
export const LogoIcon = ({ className = "w-12 h-12", forceDark = false }: { className?: string; forceDark?: boolean }) => (
  forceDark ? (
    <Image
      src="/logo.png"
      alt="Erao Logo"
      width={200}
      height={200}
      quality={100}
      priority
      className={className}
    />
  ) : (
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
  )
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
  onMouseLeave,
  variant = "light",
}: {
  label: string;
  items: { href: string; label: string; desc: string }[];
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  variant?: "dark" | "light";
}) => {
  const isDark = variant === "dark";
  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button className={`flex items-center gap-1 text-sm transition-colors py-2 bg-transparent ${isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}>
        {label}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className={`absolute top-full left-0 mt-1 w-56 rounded-xl py-2 z-50 backdrop-blur-xl ${isDark ? "bg-[#141414]/95 border border-white/10 shadow-2xl shadow-black/50" : "bg-white border border-gray-200 shadow-lg"}`}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 transition-colors ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}
            >
              <div className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>{item.label}</div>
              <div className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{item.desc}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Mobile menu accordion item
const MobileAccordion = ({
  label,
  items,
  isOpen,
  onToggle,
  onLinkClick,
  variant = "light",
}: {
  label: string;
  items: { href: string; label: string; desc: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onLinkClick: () => void;
  variant?: "dark" | "light";
}) => {
  const isDark = variant === "dark";
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2.5 text-left"
      >
        <span className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>{label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDark ? "text-gray-500" : "text-gray-400"}`}
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
              className={`block py-1.5 text-sm transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Consistent navigation bar with dropdowns and mobile menu
export const Navbar = ({ currentPage, variant = "light" }: { currentPage?: string; variant?: "dark" | "light" }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDark = variant === "dark";

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
      <nav className={`fixed top-0 left-0 right-0 h-14 px-5 sm:px-6 flex items-center justify-between z-50 backdrop-blur-md border-b ${isDark ? "bg-[#09090b]/80 border-[#1a1a1a]" : "bg-white/80 border-gray-100"}`}>
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon className="w-8 h-8 sm:w-10 sm:h-10" forceDark={isDark} />
          <span className={`font-semibold text-base sm:text-lg ${isDark ? "text-white" : ""}`}>Erao</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <NavDropdown
            label={navDropdowns.product.label}
            items={navDropdowns.product.items}
            isOpen={openDropdown === 'product'}
            onMouseEnter={() => handleMouseEnter('product')}
            onMouseLeave={handleMouseLeave}
            variant={variant}
          />
          <NavDropdown
            label={navDropdowns.resources.label}
            items={navDropdowns.resources.items}
            isOpen={openDropdown === 'resources'}
            onMouseEnter={() => handleMouseEnter('resources')}
            onMouseLeave={handleMouseLeave}
            variant={variant}
          />
          <NavDropdown
            label={navDropdowns.company.label}
            items={navDropdowns.company.items}
            isOpen={openDropdown === 'company'}
            onMouseEnter={() => handleMouseEnter('company')}
            onMouseLeave={handleMouseLeave}
            variant={variant}
          />
          <NavDropdown
            label={navDropdowns.legal.label}
            items={navDropdowns.legal.items}
            isOpen={openDropdown === 'legal'}
            onMouseEnter={() => handleMouseEnter('legal')}
            onMouseLeave={handleMouseLeave}
            variant={variant}
          />
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className={`text-sm transition-colors px-3 py-2 ${isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"}`}
          >
            Start Free
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`md:hidden p-1.5 -mr-1.5 transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
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
            className={`absolute inset-0 ${isDark ? "bg-black/40" : "bg-black/10"}`}
            onClick={closeMobileMenu}
          />

          {/* Menu Panel */}
          <div className={`absolute top-0 left-0 right-0 shadow-sm max-h-[calc(100dvh-3.5rem)] overflow-y-auto ${isDark ? "bg-[#09090b]" : "bg-white"}`}>
            <div className="px-5 py-1">
              {/* Navigation Accordions */}
              <MobileAccordion
                label={navDropdowns.product.label}
                items={navDropdowns.product.items}
                isOpen={mobileAccordion === 'product'}
                onToggle={() => setMobileAccordion(mobileAccordion === 'product' ? null : 'product')}
                onLinkClick={closeMobileMenu}
                variant={variant}
              />
              <MobileAccordion
                label={navDropdowns.resources.label}
                items={navDropdowns.resources.items}
                isOpen={mobileAccordion === 'resources'}
                onToggle={() => setMobileAccordion(mobileAccordion === 'resources' ? null : 'resources')}
                onLinkClick={closeMobileMenu}
                variant={variant}
              />
              <MobileAccordion
                label={navDropdowns.company.label}
                items={navDropdowns.company.items}
                isOpen={mobileAccordion === 'company'}
                onToggle={() => setMobileAccordion(mobileAccordion === 'company' ? null : 'company')}
                onLinkClick={closeMobileMenu}
                variant={variant}
              />
              <MobileAccordion
                label={navDropdowns.legal.label}
                items={navDropdowns.legal.items}
                isOpen={mobileAccordion === 'legal'}
                onToggle={() => setMobileAccordion(mobileAccordion === 'legal' ? null : 'legal')}
                onLinkClick={closeMobileMenu}
                variant={variant}
              />

              {/* Auth Buttons */}
              <div className={`pt-3 mt-1 border-t flex items-center gap-3 pb-4 ${isDark ? "border-[#1a1a1a]" : "border-gray-100"}`}>
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className={`flex-1 text-center py-2.5 text-sm font-medium rounded-lg transition-colors ${isDark ? "text-gray-300 hover:text-white border border-[#262626]" : "text-gray-600 hover:text-black border border-gray-200"}`}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className={`flex-1 text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"}`}
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
export const Footer = ({ variant = "light" }: { variant?: "dark" | "light" }) => {
  const isDark = variant === "dark";
  return (
    <footer className={`w-full border-t ${isDark ? "border-[#1a1a1a] bg-[#09090b]" : "border-gray-200 bg-white"}`}>
      <div className="max-w-5xl mx-auto px-6 py-10 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 mb-10 sm:mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <LogoIcon className="w-10 h-10 sm:w-12 sm:h-12" forceDark={isDark} />
              <span className={`font-semibold text-lg sm:text-xl ${isDark ? "text-white" : ""}`}>Erao</span>
            </Link>
            <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              AI-powered data intelligence.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className={`font-semibold text-sm mb-3 sm:mb-4 ${isDark ? "text-gray-200" : ""}`}>Product</h4>
            <ul className={`space-y-2 sm:space-y-3 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              <li><Link href="/features" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Features</Link></li>
              <li><Link href="/pricing" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Pricing</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className={`font-semibold text-sm mb-3 sm:mb-4 ${isDark ? "text-gray-200" : ""}`}>Resources</h4>
            <ul className={`space-y-2 sm:space-y-3 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              <li><Link href="/help" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Help Center</Link></li>
              <li><Link href="/security" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Security</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className={`font-semibold text-sm mb-3 sm:mb-4 ${isDark ? "text-gray-200" : ""}`}>Company</h4>
            <ul className={`space-y-2 sm:space-y-3 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              <li><Link href="/about" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>About</Link></li>
              <li><Link href="/contact" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className={`font-semibold text-sm mb-3 sm:mb-4 ${isDark ? "text-gray-200" : ""}`}>Legal</h4>
            <ul className={`space-y-2 sm:space-y-3 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              <li><Link href="/privacy" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Privacy</Link></li>
              <li><Link href="/terms" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Terms</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className={`pt-6 sm:pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? "border-[#1a1a1a]" : "border-gray-200"}`}>
          <p className={`text-sm text-center sm:text-left ${isDark ? "text-gray-600" : "text-gray-400"}`}>&copy; 2025 Erao. All rights reserved.</p>
          <div className={`flex items-center gap-6 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            <Link href="/privacy" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Privacy</Link>
            <Link href="/terms" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Terms</Link>
            <Link href="/contact" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-black"}`}>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Page wrapper for consistent layout
export const PageLayout = ({
  children,
  currentPage,
  variant = "light",
}: {
  children: React.ReactNode;
  currentPage?: string;
  variant?: "dark" | "light";
}) => (
  <div className={`min-h-screen flex flex-col ${variant === "dark" ? "bg-[#09090b] text-gray-100" : "bg-white text-gray-900"}`}>
    <Navbar currentPage={currentPage} variant={variant} />
    <main className="flex-1">
      {children}
    </main>
    <Footer variant={variant} />
  </div>
);
