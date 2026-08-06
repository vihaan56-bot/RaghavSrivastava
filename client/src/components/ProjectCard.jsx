import React from 'react';
import { ExternalLink } from 'lucide-react';

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

export default function ProjectCard({ project }) {
  const { title, description, image, technologies, githubLink, liveLink } = project;

  // Render a clean gradient placeholder if no image exists
  const renderImage = () => {
    if (image) {
      return (
        <img
          src={image}
          alt={title}
          style={{
            width: '100%',
            height: '200px',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform var(--transition-slow)'
          }}
        />
      );
    }

    return (
      <div
        className="flex-center"
        style={{
          width: '100%',
          height: '200px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          color: '#ffffff',
          fontFamily: 'var(--font-heading)',
          fontWeight: '800',
          fontSize: '1.8rem',
          letterSpacing: '2px',
          textShadow: '0 4px 10px rgba(0,0,0,0.2)',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        {title.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 3)}
      </div>
    );
  };

  return (
    <article className="glass-card" style={{
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <div style={{ overflow: 'hidden', position: 'relative' }}>
        {renderImage()}
      </div>

      <div style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: '1',
        gap: '16px'
      }}>
        <h3 style={{
          fontSize: '1.4rem',
          fontWeight: '700',
          color: 'var(--text-primary)'
        }}>
          {title}
        </h3>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          flexGrow: '1'
        }}>
          {description}
        </p>

        {technologies && Array.isArray(technologies) && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '8px'
          }}>
            {technologies.map((tech, index) => (
              <span
                key={index}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '4px 10px',
                  background: 'var(--glow-color)',
                  color: 'var(--primary)',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(var(--primary-rgb), 0.15)'
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '16px',
          borderTop: '1px solid var(--card-border)',
          paddingTop: '16px'
        }}>
          {githubLink && (
            <a
              href={githubLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-center"
              style={{
                gap: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
            >
              <Github size={18} />
              Code
            </a>
          )}
          {liveLink && (
            <a
              href={liveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-center"
              style={{
                gap: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginLeft: 'auto',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
            >
              <ExternalLink size={18} />
              Live Demo
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
