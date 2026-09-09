import React, { useState, useEffect } from 'react';
import { Download, Briefcase, GraduationCap, Award, Phone, Mail, MapPin, Send, ArrowRight } from 'lucide-react';

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
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SectionHeader from '../components/SectionHeader';
import ProjectCard from '../components/ProjectCard';

import { db, ref, get } from '../firebase';

export default function Portfolio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Contact form state
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [formStatus, setFormStatus] = useState({ type: '', text: '' }); // 'success', 'error', 'loading'

  // Fetch portfolio data
  useEffect(() => {
    const fetchData = async () => {
      try {
        let loadedData = null;

        // 1. Try Firebase Web SDK (Authoritative Live Database)
        try {
          const snapshot = await get(ref(db, 'portfolio'));
          if (snapshot.exists() && snapshot.val()) {
            loadedData = snapshot.val();
          }
        } catch (fbErr) {
          console.warn('Firebase direct load warning:', fbErr.message);
        }

        // 2. Try LocalStorage Cache
        let localCache = null;
        try {
          const cached = localStorage.getItem('cached_portfolio_data');
          if (cached) {
            localCache = JSON.parse(cached);
          }
        } catch (e) {
          console.warn('LocalStorage read error:', e);
        }

        // 3. Merge LocalCache into loadedData (local edits take precedence if newer)
        if (localCache) {
          loadedData = loadedData ? { ...loadedData, ...localCache } : localCache;
        }

        // 4. Fallback to API endpoint only if no Firebase or cached data exists
        if (!loadedData) {
          const res = await fetch('/api/portfolio');
          if (res.ok) {
            loadedData = await res.json();
          }
        }

        if (loadedData) {
          setData(loadedData);
        } else {
          setError('No portfolio data available.');
        }
      } catch (err) {
        console.error('Data loading error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    if (!data) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.fade-in-section');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [data]);

  // Handle contact form input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle contact form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      setFormStatus({ type: 'error', text: 'All fields are required.' });
      return;
    }

    setFormStatus({ type: 'loading', text: 'Sending message...' });

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to send message.');
      }

      setFormStatus({ type: 'success', text: 'Thank you! Your message was sent successfully.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setFormStatus({ type: 'error', text: err.message });
    }
  };

  // Scroll to section helper
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid var(--glow-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: '600' }}>Loading Portfolio...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Resilient fallback content if backend is offline/errored
  const renderData = data || {
    hero: {
      name: "Raghav Srivastava",
      tagline: "Software Engineer & Architect",
      introduction: "Welcome. Unable to connect to the backend server. Running in fallback mode.",
      profilePhoto: "",
      resumeUrl: "",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      email: "raghav@example.com"
    },
    about: { bio: "I build robust, premium systems.", details: [] },
    skills: [],
    experience: [],
    education: [],
    projects: [],
    achievements: []
  };

  const { hero, about, skills, experience, education, projects, achievements } = renderData;

  // Group skills by category
  const skillCategories = skills.reduce((acc, skill) => {
    const cat = skill.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  // Sort helper for timeline items
  const sortedExperience = [...experience].sort((a, b) => (a.order || 0) - (b.order || 0));
  const sortedEducation = [...education].sort((a, b) => (a.order || 0) - (b.order || 0));
  const sortedProjects = [...projects].sort((a, b) => (a.order || 0) - (b.order || 0));
  const sortedAchievements = [...achievements].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Hero Section */}
      <header id="hero" className="glow-effect" style={{
        padding: '160px 0 100px 0',
        display: 'flex',
        alignItems: 'center',
        minHeight: '90vh',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container grid-2" style={{ alignItems: 'center' }}>
          
          {/* Hero Content */}
          <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{
                color: 'var(--primary)',
                fontWeight: '600',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                fontSize: '0.9rem',
                marginBottom: '8px'
              }}>
                Available for Opportunities
              </p>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                fontWeight: '800',
                lineHeight: '1.1',
                color: 'var(--text-primary)'
              }}>
                Hi, I'm <span className="text-gradient">{hero.name}</span>
              </h1>
              <p style={{
                fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginTop: '12px'
              }}>
                {hero.tagline}
              </p>
            </div>

            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1.1rem',
              lineHeight: '1.7',
              maxWidth: '540px'
            }}>
              {hero.introduction}
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
              <button onClick={() => scrollToSection('projects')} className="btn btn-primary">
                View My Work
                <ArrowRight size={18} />
              </button>
              <button onClick={() => scrollToSection('contact')} className="btn btn-secondary">
                Contact Me
              </button>
              {hero.resumeUrl && (
                <a
                  href={hero.resumeUrl}
                  download
                  className="btn btn-secondary flex-center"
                  style={{ gap: '8px', borderColor: 'var(--card-border)' }}
                >
                  <Download size={18} />
                  Download CV
                </a>
              )}
            </div>

            {/* Socials */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '16px' }}>
              {hero.github && (
                <a href={hero.github} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}
                   onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                   onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>
                  <Github size={24} />
                </a>
              )}
              {hero.linkedin && (
                <a href={hero.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}
                   onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                   onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>
                  <Linkedin size={24} />
                </a>
              )}
            </div>
          </div>

          {/* Hero Avatar / Graphic */}
          <div className="flex-center animate-fade-in-up" style={{
            position: 'relative',
            animationDelay: '0.2s',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'relative',
              width: 'min(360px, 80vw)',
              height: 'min(360px, 80vw)',
              borderRadius: '50%',
              padding: '8px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              boxShadow: '0 20px 50px rgba(var(--primary-rgb), 0.3)'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {hero.profilePhoto ? (
                  <img
                    src={hero.profilePhoto}
                    alt={hero.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    fontSize: '4.5rem',
                    fontWeight: '800',
                    color: 'var(--primary)',
                    fontFamily: 'var(--font-heading)'
                  }}>
                    {hero.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* About Me Section */}
      <section id="about" className="fade-in-section" style={{ padding: '80px 0' }}>
        <div className="container">
          <SectionHeader title="About Me" subtitle="My philosophy, background, and quick facts" />
          
          <div className="grid-2" style={{ gap: '48px', alignItems: 'start' }}>
            <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: '700' }}>My Journey</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {about.bio}
              </p>
            </div>

            <div className="glass-card" style={{ padding: '40px', height: '100%' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '24px' }}>Personal Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {about.details && about.details.map((detail) => (
                  <div key={detail.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--card-border)',
                    paddingBottom: '12px'
                  }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{detail.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{detail.value}</span>
                  </div>
                ))}
                {(!about.details || about.details.length === 0) && (
                  <p style={{ color: 'var(--text-muted)' }}>No details registered.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills & Technologies Section */}
      <section id="skills" className="fade-in-section" style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <SectionHeader title="Skills & Technologies" subtitle="The technologies and tools I excel at" />

          {Object.keys(skillCategories).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {Object.entries(skillCategories).map(([category, items]) => (
                <div key={category} className="glass-card" style={{ padding: '32px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px', color: 'var(--primary)' }}>
                    {category}
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '16px'
                  }}>
                    {items.map((skill) => (
                      <div
                        key={skill.id}
                        style={{
                          padding: '16px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--radius-md)',
                          textAlign: 'center',
                          transition: 'transform var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb), 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.borderColor = 'var(--card-border)';
                        }}
                      >
                        <p style={{ fontWeight: '600', fontSize: '1.05rem' }}>{skill.name}</p>
                        {skill.level && (
                          <span style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            fontWeight: '500'
                          }}>
                            {skill.level}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No skills listed yet.</p>
          )}
        </div>
      </section>

      {/* Experience & Education Section */}
      <section id="experience" className="fade-in-section" style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="grid-2" style={{ gap: '48px' }}>
            
            {/* Experience Column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <Briefcase size={28} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Work Experience</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '2px solid var(--card-border)', paddingLeft: '24px', marginLeft: '12px' }}>
                {sortedExperience.map((exp) => (
                  <div key={exp.id} style={{ position: 'relative' }}>
                    {/* Timeline Node */}
                    <div style={{
                      position: 'absolute',
                      left: '-33px',
                      top: '6px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      border: '4px solid var(--bg-primary)'
                    }}></div>

                    <div className="glass-card" style={{ padding: '24px' }}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: 'var(--primary)',
                        background: 'var(--glow-color)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        {exp.period}
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: '12px' }}>{exp.role}</h3>
                      <h4 style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>{exp.company}</h4>
                      <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{exp.description}</p>
                    </div>
                  </div>
                ))}
                {sortedExperience.length === 0 && (
                  <p style={{ color: 'var(--text-muted)' }}>No experience items listed yet.</p>
                )}
              </div>
            </div>

            {/* Education Column */}
            <div id="education">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <GraduationCap size={28} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Education</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '2px solid var(--card-border)', paddingLeft: '24px', marginLeft: '12px' }}>
                {sortedEducation.map((edu) => (
                  <div key={edu.id} style={{ position: 'relative' }}>
                    {/* Timeline Node */}
                    <div style={{
                      position: 'absolute',
                      left: '-33px',
                      top: '6px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--secondary)',
                      border: '4px solid var(--bg-primary)'
                    }}></div>

                    <div className="glass-card" style={{ padding: '24px' }}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: 'var(--secondary)',
                        background: 'rgba(168, 85, 247, 0.1)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        {edu.period}
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: '12px' }}>{edu.degree}</h3>
                      <h4 style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>{edu.institution}</h4>
                      <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{edu.description}</p>
                    </div>
                  </div>
                ))}
                {sortedEducation.length === 0 && (
                  <p style={{ color: 'var(--text-muted)' }}>No education items listed yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="fade-in-section" style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <SectionHeader title="Featured Projects" subtitle="A curation of technical projects I've built" />

          {sortedProjects.length > 0 ? (
            <div className="grid-3">
              {sortedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No projects listed yet.</p>
          )}
        </div>
      </section>

      {/* Achievements / Certifications Section */}
      <section id="achievements" className="fade-in-section" style={{ padding: '80px 0' }}>
        <div className="container">
          <SectionHeader title="Achievements & Certifications" subtitle="Special recognitions and certifications I've earned" />

          {sortedAchievements.length > 0 ? (
            <div className="grid-2" style={{ gap: '24px' }}>
              {sortedAchievements.map((ach) => (
                <div key={ach.id} className="glass-card flex-center" style={{
                  padding: '24px',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  gap: '20px'
                }}>
                  <div style={{
                    background: 'var(--glow-color)',
                    color: 'var(--primary)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Award size={28} />
                  </div>
                  <div style={{ flexGrow: '1' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '750' }}>{ach.title}</h3>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'var(--text-muted)'
                      }}>
                        {ach.date}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: '600', marginTop: '4px' }}>{ach.issuer}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No achievements listed yet.</p>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="fade-in-section" style={{ padding: '80px 0', background: 'var(--bg-secondary)', flexGrow: '1' }}>
        <div className="container">
          <SectionHeader title="Contact Me" subtitle="Let's build something together" />

          <div className="grid-2" style={{ gap: '48px', alignItems: 'start' }}>
            
            {/* Contact Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Get In Touch</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.7' }}>
                  If you have a project idea, want to discuss a software role, or just want to chat technology, feel free to drop a message or reach out on my listed channels. I will do my best to get back to you within 24 hours.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {hero.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--primary)'
                    }} className="flex-center">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Email Me</p>
                      <a href={`mailto:${hero.email}`} style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{hero.email}</a>
                    </div>
                  </div>
                )}

                {hero.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--primary)'
                    }} className="flex-center">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Call Me</p>
                      <a href={`tel:${hero.phone}`} style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{hero.phone}</a>
                    </div>
                  </div>
                )}

                {hero.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--primary)'
                    }} className="flex-center">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Location</p>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{hero.location}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Form Card */}
            <div className="glass-card" style={{ padding: '40px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }} className="contact-form-row">
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label htmlFor="name" className="form-label">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label htmlFor="subject" className="form-label">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Project Collaboration"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label htmlFor="message" className="form-label">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Describe your project, ideas, or requirements..."
                    className="form-textarea"
                    required
                  ></textarea>
                </div>

                {formStatus.text && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    fontWeight: '550',
                    background: formStatus.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : formStatus.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'var(--glow-color)',
                    color: formStatus.type === 'success' ? '#22c55e' : formStatus.type === 'error' ? '#ef4444' : 'var(--primary)',
                    border: '1px solid',
                    borderColor: formStatus.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : formStatus.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(var(--primary-rgb), 0.2)'
                  }}>
                    {formStatus.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formStatus.type === 'loading'}
                  className="btn btn-primary flex-center"
                  style={{ gap: '8px', width: '100%', marginTop: '8px' }}
                >
                  <Send size={18} />
                  {formStatus.type === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      <Footer heroData={hero} />

      {/* Inline media query style overrides for grid contact form */}
      <style>{`
        @media (max-width: 576px) {
          .contact-form-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
