import express from 'express';
import { getPortfolioData, savePortfolioData } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get full portfolio data (Public)
router.get('/', async (req, res) => {
  try {
    const data = await getPortfolioData();
    return res.json(data);
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return res.status(500).json({ message: error.message || 'Error retrieving portfolio data.' });
  }
});

// Update Hero section (Protected)
router.put('/hero', authenticateToken, async (req, res) => {
  try {
    const data = await getPortfolioData();
    const { name, tagline, introduction, profilePhoto, resumeUrl, github, linkedin, email, phone, location } = req.body;

    data.hero = {
      name: name || data.hero.name,
      tagline: tagline || data.hero.tagline,
      introduction: introduction || data.hero.introduction,
      profilePhoto: profilePhoto !== undefined ? profilePhoto : data.hero.profilePhoto,
      resumeUrl: resumeUrl !== undefined ? resumeUrl : data.hero.resumeUrl,
      github: github !== undefined ? github : data.hero.github,
      linkedin: linkedin !== undefined ? linkedin : data.hero.linkedin,
      email: email !== undefined ? email : data.hero.email,
      phone: phone !== undefined ? phone : data.hero.phone,
      location: location !== undefined ? location : data.hero.location,
    };

    await savePortfolioData(data);
    return res.json({ message: 'Hero section updated successfully.', hero: data.hero });
  } catch (error) {
    console.error('Error updating hero:', error);
    return res.status(500).json({ message: error.message || 'Error updating hero data.' });
  }
});

// Update About section (Protected)
router.put('/about', authenticateToken, async (req, res) => {
  try {
    const data = await getPortfolioData();
    const { bio, details } = req.body;

    if (bio !== undefined) data.about.bio = bio;
    if (details !== undefined && Array.isArray(details)) data.about.details = details;

    await savePortfolioData(data);
    return res.json({ message: 'About section updated successfully.', about: data.about });
  } catch (error) {
    console.error('Error updating about:', error);
    return res.status(500).json({ message: error.message || 'Error updating about data.' });
  }
});

// Update Skills array (Protected)
router.put('/skills', authenticateToken, async (req, res) => {
  try {
    const { skills } = req.body;
    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills must be an array.' });
    }

    const data = await getPortfolioData();
    data.skills = skills;
    await savePortfolioData(data);

    return res.json({ message: 'Skills updated successfully.', skills: data.skills });
  } catch (error) {
    console.error('Error updating skills:', error);
    return res.status(500).json({ message: error.message || 'Error updating skills.' });
  }
});

// Update Education array (Protected)
router.put('/education', authenticateToken, async (req, res) => {
  try {
    const { education } = req.body;
    if (!education || !Array.isArray(education)) {
      return res.status(400).json({ message: 'Education must be an array.' });
    }

    const data = await getPortfolioData();
    data.education = education;
    await savePortfolioData(data);

    return res.json({ message: 'Education updated successfully.', education: data.education });
  } catch (error) {
    console.error('Error updating education:', error);
    return res.status(500).json({ message: error.message || 'Error updating education.' });
  }
});

// Update Experience array (Protected)
router.put('/experience', authenticateToken, async (req, res) => {
  try {
    const { experience } = req.body;
    if (!experience || !Array.isArray(experience)) {
      return res.status(400).json({ message: 'Experience must be an array.' });
    }

    const data = await getPortfolioData();
    data.experience = experience;
    await savePortfolioData(data);

    return res.json({ message: 'Experience updated successfully.', experience: data.experience });
  } catch (error) {
    console.error('Error updating experience:', error);
    return res.status(500).json({ message: error.message || 'Error updating experience.' });
  }
});

// Update Projects array (Protected)
router.put('/projects', authenticateToken, async (req, res) => {
  try {
    const { projects } = req.body;
    if (!projects || !Array.isArray(projects)) {
      return res.status(400).json({ message: 'Projects must be an array.' });
    }

    const data = await getPortfolioData();
    data.projects = projects;
    await savePortfolioData(data);

    return res.json({ message: 'Projects updated successfully.', projects: data.projects });
  } catch (error) {
    console.error('Error updating projects:', error);
    return res.status(500).json({ message: error.message || 'Error updating projects.' });
  }
});

// Update Achievements array (Protected)
router.put('/achievements', authenticateToken, async (req, res) => {
  try {
    const { achievements } = req.body;
    if (!achievements || !Array.isArray(achievements)) {
      return res.status(400).json({ message: 'Achievements must be an array.' });
    }

    const data = await getPortfolioData();
    data.achievements = achievements;
    await savePortfolioData(data);

    return res.json({ message: 'Achievements updated successfully.', achievements: data.achievements });
  } catch (error) {
    console.error('Error updating achievements:', error);
    return res.status(500).json({ message: error.message || 'Error updating achievements.' });
  }
});

export default router;
