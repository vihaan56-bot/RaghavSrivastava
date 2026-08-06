import React from 'react';

export default function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header-container" style={{
      textAlign: 'center',
      marginBottom: '48px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      <h2 style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        textTransform: 'capitalize',
        position: 'relative',
        display: 'inline-block',
        paddingBottom: '12px'
      }}>
        {title}
        <span style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '4px',
          borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)'
        }}></span>
      </h2>
      {subtitle && (
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.1rem',
          maxWidth: '600px',
          marginTop: '8px'
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
