import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { kv } from '@vercel/kv';

const isVercelKv = !!process.env.KV_REST_API_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const PORTFOLIO_DB_PATH = path.join(DATA_DIR, 'portfolio.json');
const MESSAGES_DB_PATH = path.join(DATA_DIR, 'messages.json');
const USERS_DB_PATH = path.join(DATA_DIR, 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Simple async queue lock to prevent concurrent write corruptions
class AsyncLock {
  constructor() {
    this.promise = Promise.resolve();
  }

  acquire() {
    let resolve;
    const nextPromise = new Promise((r) => {
      resolve = r;
    });
    const currentPromise = this.promise;
    this.promise = nextPromise;
    return currentPromise.then(() => resolve);
  }
}

const dbLock = new AsyncLock();

// Helper to ensure directories exist
async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

// Initial default data for portfolio
const defaultPortfolio = {
  hero: {
    name: "Raghav Srivastava",
    tagline: "Full-Stack Software Engineer & Tech Innovator",
    introduction: "I engineer premium, high-performance web applications that bridge elegant user experience with robust system architecture. Specializing in React, Node.js, and cloud systems.",
    profilePhoto: "", // empty initially, admin can upload
    resumeUrl: "", // empty initially, admin can upload
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    email: "raghav@example.com",
    phone: "9026269324",
    location: "San Francisco, CA"
  },
  about: {
    bio: "I am a results-driven software engineer passionate about solving complex system-level problems and building user-centric interfaces. With a strong foundation in modern Javascript ecosystem and database design, I build application architectures that scale smoothly. I constantly challenge myself to learn emerging technologies and apply best engineering practices in my work.",
    details: [
      { id: "d1", label: "Full Name", value: "Raghav Srivastava" },
      { id: "d2", label: "Email", value: "raghav@example.com" },
      { id: "d3", label: "Core Role", value: "Software Engineer" },
      { id: "d4", label: "Location", value: "San Francisco, CA" }
    ]
  },
  skills: [
    { id: "s1", name: "React", category: "Frontend", level: "Expert", order: 1 },
    { id: "s2", name: "Node.js & Express", category: "Backend", level: "Expert", order: 2 },
    { id: "s3", name: "JavaScript / TypeScript", category: "Frontend", level: "Expert", order: 3 },
    { id: "s4", name: "HTML5 & Modern CSS", category: "Frontend", level: "Expert", order: 4 },
    { id: "s5", name: "PostgreSQL & SQL", category: "Database", level: "Intermediate", order: 5 },
    { id: "s6", name: "REST APIs & GraphQL", category: "Backend", level: "Expert", order: 6 },
    { id: "s7", name: "Git & CI/CD", category: "Tools", level: "Expert", order: 7 },
    { id: "s8", name: "Docker", category: "Tools", level: "Intermediate", order: 8 }
  ],
  education: [
    {
      id: "edu1",
      degree: "B.S. in Computer Science",
      institution: "Tech State University",
      period: "2019 - 2023",
      description: "Graduated with Honors. Specialization in Software Engineering and Distributed Networks. Lead developer for the university programming society.",
      order: 1
    }
  ],
  experience: [
    {
      id: "exp1",
      role: "Software Engineer",
      company: "Apex Tech Labs",
      period: "2023 - Present",
      description: "Designed microservices using Node.js, built real-time analytics dashboards in React, and optimized query runtimes by 35%. Managed CI/CD deployment pipelines on AWS.",
      order: 1
    },
    {
      id: "exp2",
      role: "Frontend Developer Intern",
      company: "CodeSphere Innovations",
      period: "Summer 2022",
      description: "Developed user-facing dashboard widgets, implemented state-management, and polished UI components to match Figma designs.",
      order: 2
    }
  ],
  projects: [
    {
      id: "proj1",
      title: "Interactive Dev Workspace",
      description: "A collaborative browser-based editor featuring real-time markdown rendering, package installation simulations, and syntax-highlighted code blocks.",
      image: "",
      technologies: ["React", "CSS Modules", "Node.js", "Socket.io"],
      githubLink: "https://github.com",
      liveLink: "https://example.com",
      order: 1
    },
    {
      id: "proj2",
      title: "Secure FinTech Gateway",
      description: "An API gateway utilizing JWT session handling, secure environment storage, rate-limiting, and detailed backend logging to process sandbox transactions.",
      image: "",
      technologies: ["Node.js", "Express", "SQLite", "bcryptjs"],
      githubLink: "https://github.com",
      liveLink: "https://example.com",
      order: 2
    }
  ],
  achievements: [
    {
      id: "ach1",
      title: "Certified AWS Cloud Practitioner",
      issuer: "Amazon Web Services",
      date: "Feb 2024",
      description: "Credential validating complete overview of AWS cloud services, infrastructure, security, and pricing structures.",
      order: 1
    },
    {
      id: "ach2",
      title: "1st Place Winner - Regional Hackfest",
      issuer: "HackFest Org",
      date: "Oct 2022",
      description: "Led a 4-person team to create a smart traffic scheduling visualizer, winning first place out of 40 contesting teams.",
      order: 2
    }
  ]
};

// Seeding function
export async function initializeDb() {
  if (isVercelKv) {
    console.log("Checking Vercel KV Database connection...");
    try {
      // Seed portfolio
      const portfolio = await kv.get('portfolio');
      if (!portfolio) {
        await kv.set('portfolio', defaultPortfolio);
        console.log("Seeded default portfolio data to Vercel KV.");
      }

      // Seed messages
      const messages = await kv.get('messages');
      if (!messages) {
        await kv.set('messages', []);
        console.log("Initialized messages list in Vercel KV.");
      }

      // Seed users
      const users = await kv.get('users');
      if (!users) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("MaaMaa1234", salt);
        const initialUsers = [
          {
            username: "admin",
            passwordHash: hashedPassword
          }
        ];
        await kv.set('users', initialUsers);
        console.log("Seeded initial admin user credentials to Vercel KV.");
      }
      console.log("Vercel KV database checked and initialized.");
    } catch (err) {
      console.error("Vercel KV initialization error:", err);
      throw err;
    }
    return;
  }

  if (process.env.VERCEL) {
    console.warn("WARNING: Running on Vercel without Vercel KV database linked. Seeding bypassed.");
    return;
  }

  await ensureDirs();

  // 1. Initialise Portfolio JSON
  try {
    await fs.access(PORTFOLIO_DB_PATH);
  } catch {
    // If file doesn't exist, create it with default data
    await fs.writeFile(PORTFOLIO_DB_PATH, JSON.stringify(defaultPortfolio, null, 2), 'utf-8');
    console.log("Seeded default portfolio data.");
  }

  // 2. Initialise Messages JSON
  try {
    await fs.access(MESSAGES_DB_PATH);
  } catch {
    await fs.writeFile(MESSAGES_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
    console.log("Initialized messages DB.");
  }

  // 3. Initialise User Credentials JSON
  try {
    await fs.access(USERS_DB_PATH);
  } catch {
    // Hash "MaaMaa1234"
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("MaaMaa1234", salt);
    const initialUsers = [
      {
        username: "admin",
        passwordHash: hashedPassword
      }
    ];
    await fs.writeFile(USERS_DB_PATH, JSON.stringify(initialUsers, null, 2), 'utf-8');
    console.log("Seeded initial admin user credentials.");
  }
}

// Portfolio getters & setters
export async function getPortfolioData() {
  if (isVercelKv) {
    const data = await kv.get('portfolio');
    return data || defaultPortfolio;
  }
  if (process.env.VERCEL) {
    console.warn("WARNING: Serving default portfolio content as fallback on Vercel.");
    return defaultPortfolio;
  }
  await ensureDirs();
  const data = await fs.readFile(PORTFOLIO_DB_PATH, 'utf-8');
  return JSON.parse(data);
}

export async function savePortfolioData(data) {
  if (isVercelKv) {
    await kv.set('portfolio', data);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("Local filesystem is read-only on Vercel. Please link a Vercel KV database in the dashboard storage tab to save modifications.");
  }
  await ensureDirs();
  const release = await dbLock.acquire();
  try {
    await fs.writeFile(PORTFOLIO_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } finally {
    release();
  }
}

// Message getters & setters
export async function getMessages() {
  if (isVercelKv) {
    const data = await kv.get('messages');
    return data || [];
  }
  if (process.env.VERCEL) {
    return [];
  }
  await ensureDirs();
  const data = await fs.readFile(MESSAGES_DB_PATH, 'utf-8');
  return JSON.parse(data);
}

export async function saveMessages(messages) {
  if (isVercelKv) {
    await kv.set('messages', messages);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("Local filesystem is read-only on Vercel. Please link a Vercel KV database to save messages.");
  }
  await ensureDirs();
  const release = await dbLock.acquire();
  try {
    await fs.writeFile(MESSAGES_DB_PATH, JSON.stringify(messages, null, 2), 'utf-8');
  } finally {
    release();
  }
}

// User credentials getters & setters
export async function getUsers() {
  if (isVercelKv) {
    const data = await kv.get('users');
    return data || [];
  }
  if (process.env.VERCEL) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("MaaMaa1234", salt);
    return [{ username: "admin", passwordHash: hashedPassword }];
  }
  await ensureDirs();
  const data = await fs.readFile(USERS_DB_PATH, 'utf-8');
  return JSON.parse(data);
}

export async function saveUsers(users) {
  if (isVercelKv) {
    await kv.set('users', users);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("Local filesystem is read-only on Vercel. Please link a Vercel KV database to update credentials.");
  }
  await ensureDirs();
  const release = await dbLock.acquire();
  try {
    await fs.writeFile(USERS_DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } finally {
    release();
  }
}
