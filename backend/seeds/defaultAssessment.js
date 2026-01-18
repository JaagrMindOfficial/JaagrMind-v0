require('dotenv').config();
const mongoose = require('mongoose');
const Assessment = require('../models/Assessment');
const Admin = require('../models/Admin');

// Default 32-question assessment
const defaultAssessment = {
    title: 'Student Wellness Assessment',
    description: 'A comprehensive 32-question assessment to understand your current mental wellness and skill areas.',
    isDefault: true,
    timePerQuestion: 30,
    totalTime: 15,
    sectionBuckets: true,
    questions: [
        // SECTION A: FOCUS & ATTENTION (Questions 1-8)
        { text: 'I feel mentally tired before I begin my work', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I delay starting tasks that feel big or difficult.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'My mind keeps jumping between thoughts when I try to study.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel pressure or stress when I need to concentrate.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel overwhelmed when I have many things to do.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'Even simple work feels exhausting sometimes.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I can stay focused once I begin a task.', section: 'A', sectionName: 'Focus & Attention', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },
        { text: 'I feel calm and steady while working on something.', section: 'A', sectionName: 'Focus & Attention', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },

        // SECTION B: SELF-ESTEEM & INNER CONFIDENCE (Questions 9-16)
        { text: 'I am very hard on myself when I make mistakes.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I compare myself to others and feel less capable.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I doubt my abilities even when I try sincerely.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel disappointed in myself easily.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I replay my mistakes in my mind for a long time.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I judge myself more harshly than others judge me.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel okay about myself even when I don\'t do well.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },
        { text: 'I can encourage myself after making a mistake.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },

        // SECTION C: SOCIAL CONFIDENCE & INTERACTION (Questions 17-24)
        { text: 'I hesitate to speak up even when I know the answer.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I worry about what others think of me.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel awkward or uncomfortable in group situations.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I avoid participating in class discussions.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I stay quiet to avoid saying the wrong thing.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel left out or invisible at school.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel comfortable sharing my thoughts in groups.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },
        { text: 'I feel confident interacting with classmates.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },

        // SECTION D: DIGITAL HYGIENE & SELF-CONTROL (Questions 25-32)
        { text: 'I use my phone or screen when I feel bored or restless.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I lose track of time while scrolling or gaming.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel irritated when my screen time is limited.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I check my phone even when I know I should not.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I use screens to avoid uncomfortable feelings or tasks.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I find it hard to stop using screens once I start.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I can put my phone away when I decide to.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },
        { text: 'I feel comfortable being offline for some time.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] }
    ],
    buckets: [
        { label: 'Skill Stable', minScore: 8, maxScore: 14, color: '#4CAF50' },
        { label: 'Skill Emerging', minScore: 15, maxScore: 22, color: '#FF9800' },
        { label: 'Skill Support Needed', minScore: 23, maxScore: 32, color: '#F44336' }
    ]
};

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if default assessment already exists
        const existingAssessment = await Assessment.findOne({ isDefault: true });
        if (existingAssessment) {
            console.log('Default assessment already exists. Updating...');
            await Assessment.findByIdAndUpdate(existingAssessment._id, defaultAssessment);
            console.log('Default assessment updated!');
        } else {
            await Assessment.create(defaultAssessment);
            console.log('Default 32-question assessment created!');
        }

        // Create default admin if not exists
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (!existingAdmin) {
            await Admin.create({
                email: adminEmail,
                password: adminPassword,
                name: 'JaagrMind Admin',
                role: 'admin'
            });
            console.log(`Default admin created: ${adminEmail}`);
        } else {
            console.log('Admin already exists');
        }

        console.log('\n✅ Database seeding completed!');
        console.log('\n📋 Login Credentials:');
        console.log(`   Admin Email: ${adminEmail}`);
        console.log(`   Admin Password: ${adminPassword}`);

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedDatabase();
