import React from 'react';
import { Mail, ArrowUp } from 'lucide-react';

const Github = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Linkedin = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Footer({ heroData }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--card-border)',
      padding: '48px 0 24px 0',
      color: 'var(--text-secondary)',
      marginTop: '80px'
    }}>
      <div className="container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        {/* Logo and tag */}
        <div style={{ textAlign: 'center' }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            fontWeight: '800'
          }}>
            Raghav <span className="text-gradient">Srivastava</span>
          </h3>
          <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            {heroData?.tagline || 'Full-Stack Software Engineer'}
          </p>
        </div>

        {/* Social Icons */}
        <div style={{
          display: 'flex',
          gap: '24px'
        }}>
          {heroData?.github && (
            <a
              href={heroData.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              style={{
                color: 'var(--text-secondary)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              <Github size={22} />
            </a>
          )}
          {heroData?.linkedin && (
            <a
              href={heroData.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              style={{
                color: 'var(--text-secondary)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              <Linkedin size={22} />
            </a>
          )}
          {heroData?.email && (
            <a
              href={`mailto:${heroData.email}`}
              aria-label="Email"
              style={{
                color: 'var(--text-secondary)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              <Mail size={22} />
            </a>
          )}
        </div>

        {/* Back to top & copyright */}
        <div style={{
          width: '100%',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '0.85rem'
        }}>
          <p>© {currentYear} Raghav Srivastava. All rights reserved.</p>

          <button
            onClick={scrollToTop}
            className="flex-center"
            aria-label="Scroll to top"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-full)',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.color = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--card-border)';
              e.target.style.color = 'var(--text-primary)';
            }}
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </footer>
  );
}
