import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShieldAlert } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const token = localStorage.getItem('adminToken');
  const isAdminPath = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on page shift
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navItems = [
    { label: 'About', path: 'about' },
    { label: 'Skills', path: 'skills' },
    { label: 'Experience', path: 'experience' },
    { label: 'Education', path: 'education' },
    { label: 'Projects', path: 'projects' },
    { label: 'Achievements', path: 'achievements' },
    { label: 'Contact', path: 'contact' }
  ];

  const handleNavClick = (sectionId) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for navigation before scrolling
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navStyle = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    zIndex: '1000',
    background: isScrolled ? 'var(--nav-bg)' : 'transparent',
    backdropFilter: isScrolled ? 'blur(16px)' : 'none',
    WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
    borderBottom: isScrolled ? '1px solid var(--card-border)' : '1px solid transparent',
    transition: 'all var(--transition-normal)'
  };

  return (
    <nav style={navStyle}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '80px'
      }}>
        {/* Logo */}
        <Link to="/" style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.5rem',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span className="text-gradient">Raghav.</span>
        </Link>

        {/* Desktop Navigation Links */}
        {!isAdminPath && (
          <div style={{
            display: 'none',
            alignItems: 'center',
            gap: '32px'
          }} className="desktop-nav">
            {navItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleNavClick(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontWeight: '500',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Right Action items */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <ThemeToggle />

          {/* Admin Dashboard Entry */}
          {token ? (
            <Link
              to="/admin/dashboard"
              className="btn btn-secondary flex-center"
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                gap: '6px'
              }}
            >
              <ShieldAlert size={16} />
              Dashboard
            </Link>
          ) : (
            <Link
              to="/admin/login"
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              Admin Portal
            </Link>
          )}

          {/* Mobile hamburger button */}
          {!isAdminPath && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              className="mobile-nav-toggle"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer (Only visible when toggled) */}
      {!isAdminPath && isOpen && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '0',
          width: '100%',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--card-border)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: '999',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeInUp 0.3s ease forwards'
        }}>
          {navItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleNavClick(item.path)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '1.1rem',
                textAlign: 'left',
                padding: '8px 0',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* CSS overrides to show/hide desktop elements */}
      <style>{`
        @media (min-width: 769px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-nav-toggle {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
