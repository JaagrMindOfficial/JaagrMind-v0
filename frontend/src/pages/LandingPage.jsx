import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBrain,
    faSchool,
    faChartLine,
    faShieldAlt,
    faEnvelope,
    faPhone,
    faLocationDot,
    faArrowRight,
    faHeart,
    faUsers,
    faStar
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import lightThemeLogo from '../assets/DarkColorLogo.svg';
import darkThemeLogo from '../assets/LightColorLogo.svg';
import Background3D from '../components/common/Background3D';
import './LandingPage.css';

const LandingPage = () => {
    const { theme, toggleTheme } = useTheme();
    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' or 'error'

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/api/tickets/public', formData);
            setSubmitStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
            setTimeout(() => setSubmitStatus(null), 5000);
        } catch (error) {
            console.error('Error sending message:', error);
            setSubmitStatus('error');
            setTimeout(() => setSubmitStatus(null), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const features = [
        {
            icon: faBrain,
            title: 'AI-Powered Check-ins',
            description: 'Smart wellness check-ins that adapt to each student\'s responses for accurate insights.'
        },
        {
            icon: faSchool,
            title: 'Multi-School Management',
            description: 'Manage multiple schools from a single dashboard with comprehensive analytics.'
        },
        {
            icon: faChartLine,
            title: 'Real-Time Analytics',
            description: 'Track student wellness trends with beautiful, actionable visualizations.'
        },
        {
            icon: faShieldAlt,
            title: 'Privacy First',
            description: 'Enterprise-grade security ensuring student data remains protected and confidential.'
        }
    ];

    const stats = [
        { value: '10K+', label: 'Students Assessed' },
        { value: '50+', label: 'Partner Schools' },
        { value: '98%', label: 'Satisfaction Rate' },
        { value: '24/7', label: 'Support Available' }
    ];

    return (
        <div className="landing-page">
            {/* Navbar */}
            <nav className="landing-nav">
                <div className="nav-container">
                    <Link to="/" className="nav-logo">
                        <img src={logoImg} alt="JaagrMind" />
                    </Link>
                    <div className="nav-links">
                        <a href="#features">Features</a>
                        <a href="#about">About</a>
                        <a href="#contact">Contact</a>
                        <button className="theme-toggle-btn" onClick={toggleTheme}>
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <Link to="/login" className="btn btn-outline btn-sm">Admin Login</Link>
                        <Link to="/student/login" className="btn btn-primary btn-sm">Student Login</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <Background3D />
                <motion.div
                    className="hero-content"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.span
                        className="hero-badge"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <FontAwesomeIcon icon={faStar} /> Trusted by 50+ Schools
                    </motion.span>
                    <h1>Empowering Student <span className="gradient-text">Emotional Well-being</span></h1>
                    <p className="hero-subtitle">
                        A comprehensive SaaS platform for schools to support, monitor, and encourage
                        student emotional well-being through engaging, gamified check-ins.
                    </p>
                    <div className="hero-cta">
                        <Link to="/login" className="btn btn-primary btn-lg">
                            Get Started <FontAwesomeIcon icon={faArrowRight} />
                        </Link>
                        <a href="#contact" className="btn btn-outline btn-lg">
                            Contact Us
                        </a>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    className="hero-stats glass-panel"
                    initial={{ opacity: 0, y: 100 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.8 }}
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            className="stat-item"
                            whileHover={{ scale: 1.1, translateY: -5 }}
                            onHoverStart={() => navigator.vibrate && navigator.vibrate(30)}
                        >
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="section-container">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="section-badge">Features</span>
                        <h2>Why Choose <span className="gradient-text">JaagrMind</span>?</h2>
                        <p>Our platform provides everything you need to support student emotional well-being</p>
                    </motion.div>

                    <div className="features-grid">
                        <motion.div
                            key={0}
                            className="feature-card glass-panel"
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: false, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0 }}
                            whileHover={{
                                scale: 1.05,
                                rotate: [0, -2, 2, -2, 0],
                                transition: { duration: 0.3 }
                            }}
                            onHoverStart={() => {
                                if (navigator.vibrate) navigator.vibrate(50);
                            }}
                        >
                            <div className="feature-icon">
                                <FontAwesomeIcon icon={faBrain} />
                            </div>
                            <h3>AI-Powered Check-ins</h3>
                            <p>Smart wellness check-ins that adapt to each student's responses for accurate insights.</p>
                        </motion.div>
                        <motion.div
                            key={1}
                            className="feature-card glass-panel"
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: false, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            whileHover={{
                                scale: 1.05,
                                rotate: [0, -2, 2, -2, 0],
                                transition: { duration: 0.3 }
                            }}
                            onHoverStart={() => {
                                if (navigator.vibrate) navigator.vibrate(50);
                            }}
                        >
                            <div className="feature-icon">
                                <FontAwesomeIcon icon={faSchool} />
                            </div>
                            <h3>Multi-School Support</h3>
                            <p>Support multiple schools from a single dashboard with comprehensive analytics.</p>
                        </motion.div>
                        <motion.div
                            key={2}
                            className="feature-card glass-panel"
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: false, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            whileHover={{
                                scale: 1.05,
                                rotate: [0, -2, 2, -2, 0],
                                transition: { duration: 0.3 }
                            }}
                            onHoverStart={() => {
                                if (navigator.vibrate) navigator.vibrate(50);
                            }}
                        >
                            <div className="feature-icon">
                                <FontAwesomeIcon icon={faChartLine} />
                            </div>
                            <h3>Real-Time Insights</h3>
                            <p>Visualize student wellness trends with beautiful, actionable visualizations.</p>
                        </motion.div>
                        <motion.div
                            key={3}
                            className="feature-card glass-panel"
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: false, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            whileHover={{
                                scale: 1.05,
                                rotate: [0, -2, 2, -2, 0],
                                transition: { duration: 0.3 }
                            }}
                            onHoverStart={() => {
                                if (navigator.vibrate) navigator.vibrate(50);
                            }}
                        >
                            <div className="feature-icon">
                                <FontAwesomeIcon icon={faShieldAlt} />
                            </div>
                            <h3>Privacy First</h3>
                            <p>Enterprise-grade security ensuring student data remains protected and confidential.</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="about-section">
                <div className="section-container">
                    <div className="about-content">
                        <motion.div
                            className="about-text"
                            initial={{ opacity: 0, x: -100 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                        >
                            <span className="section-badge">Our Mission</span>
                            <h2>Building a <span className="gradient-text">Healthier Future</span></h2>
                            <p>
                                At JaagrMind, we believe every student deserves access to emotional well-being support.
                                Our mission is to empower schools with the tools they need to identify, understand,
                                and support students' emotional well-being.
                            </p>
                            <p>
                                Through innovative technology and research-backed check-ins, we're creating a
                                world where emotional well-being is prioritized alongside academic success.
                            </p>
                            <div className="about-values">
                                <motion.div
                                    className="value-item"
                                    whileHover={{ scale: 1.1, x: 10 }}
                                    onHoverStart={() => navigator.vibrate && navigator.vibrate(20)}
                                >
                                    <FontAwesomeIcon icon={faHeart} className="value-icon" />
                                    <span>Compassion First</span>
                                </motion.div>
                                <motion.div
                                    className="value-item"
                                    whileHover={{ scale: 1.1, x: 10 }}
                                    onHoverStart={() => navigator.vibrate && navigator.vibrate(20)}
                                >
                                    <FontAwesomeIcon icon={faUsers} className="value-icon" />
                                    <span>Student-Centered</span>
                                </motion.div>
                                <motion.div
                                    className="value-item"
                                    whileHover={{ scale: 1.1, x: 10 }}
                                    onHoverStart={() => navigator.vibrate && navigator.vibrate(20)}
                                >
                                    <FontAwesomeIcon icon={faShieldAlt} className="value-icon" />
                                    <span>Privacy Protected</span>
                                </motion.div>
                            </div>
                        </motion.div>
                        <motion.div
                            className="about-visual"
                            initial={{ opacity: 0, x: 100, rotate: 10 }}
                            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            whileHover={{ scale: 1.05, rotate: -2 }}
                        >
                            <div className="visual-card">
                                <div className="visual-icon">🧠</div>
                                <h3>Emotional Well-being</h3>
                                <p>Supporting the whole student</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="contact-section">
                <div className="section-container">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <span className="section-badge">Get in Touch</span>
                        <h2>Contact <span className="gradient-text">Us</span></h2>
                        <p>Ready to transform student well-being at your school? Reach out to us!</p>
                    </motion.div>

                    <div className="contact-grid">
                        <motion.div
                            className="contact-info"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="contact-item">
                                <div className="contact-icon">
                                    <FontAwesomeIcon icon={faEnvelope} />
                                </div>
                                <div>
                                    <h4>Email</h4>
                                    <p>support@jaagrmind.com</p>
                                </div>
                            </div>
                            <div className="contact-item">
                                <div className="contact-icon">
                                    <FontAwesomeIcon icon={faPhone} />
                                </div>
                                <div>
                                    <h4>Phone</h4>
                                    <p>+91 80058 73864</p>
                                </div>
                            </div>
                            <div className="contact-item">
                                <div className="contact-icon">
                                    <FontAwesomeIcon icon={faLocationDot} />
                                </div>
                                <div>
                                    <h4>Location</h4>
                                    <p>Bengaluru, India</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.form
                            className="contact-form glass-panel"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            onSubmit={handleSubmit}
                        >
                            {submitStatus === 'success' && (
                                <div className="alert alert-success mb-4" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                                    Message sent successfully! We'll get back to you soon.
                                </div>
                            )}
                            {submitStatus === 'error' && (
                                <div className="alert alert-error mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                                    Failed to send message. Please try again later.
                                </div>
                            )}
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="name"
                                    className="form-input"
                                    placeholder="Your Name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    placeholder="Your Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="subject"
                                    className="form-input"
                                    placeholder="Subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <textarea
                                    name="message"
                                    className="form-input"
                                    placeholder="Your Message"
                                    rows="4"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                ></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={isSubmitting}>
                                {isSubmitting ? 'Sending...' : (
                                    <>Send Message <FontAwesomeIcon icon={faArrowRight} /></>
                                )}
                            </button>
                        </motion.form>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-container">
                    <div className="footer-brand">
                        <img src={logoImg} alt="JaagrMind" />
                        <p>Empowering schools to support student emotional well-being through innovative technology.</p>

                    </div>
                    <div className="footer-links">
                        <div className="footer-col">
                            <h4>Quick Links</h4>
                            <a href="#features">Features</a>
                            <a href="#about">About Us</a>
                            <a href="#contact">Contact</a>
                        </div>
                        <div className="footer-col">
                            <h4>Login</h4>
                            <Link to="/login">Admin Portal</Link>
                            <Link to="/student/login">Student Portal</Link>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} JaagrMind. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
