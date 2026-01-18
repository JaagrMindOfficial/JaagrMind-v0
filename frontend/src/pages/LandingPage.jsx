import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
import './LandingPage.css';

const LandingPage = () => {
    const { theme, toggleTheme } = useTheme();
    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;

    const features = [
        {
            icon: faBrain,
            title: 'AI-Powered Assessments',
            description: 'Smart wellness assessments that adapt to each student\'s responses for accurate insights.'
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
                <div className="hero-bg-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                </div>
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
                    <h1>Empowering Student <span className="gradient-text">Mental Wellness</span></h1>
                    <p className="hero-subtitle">
                        A comprehensive SaaS platform for schools to assess, monitor, and support
                        student mental wellness through engaging, gamified assessments.
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
                    className="hero-stats"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                >
                    {stats.map((stat, index) => (
                        <div key={index} className="stat-item">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    ))}
                </motion.div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="section-container">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <span className="section-badge">Features</span>
                        <h2>Why Choose <span className="gradient-text">JaagrMind</span>?</h2>
                        <p>Our platform provides everything you need to support student mental wellness</p>
                    </motion.div>

                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="feature-card"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="feature-icon">
                                    <FontAwesomeIcon icon={feature.icon} />
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="about-section">
                <div className="section-container">
                    <div className="about-content">
                        <motion.div
                            className="about-text"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <span className="section-badge">Our Mission</span>
                            <h2>Building a <span className="gradient-text">Healthier Future</span></h2>
                            <p>
                                At JaagrMind, we believe every student deserves access to mental wellness support.
                                Our mission is to empower schools with the tools they need to identify, understand,
                                and support students' emotional well-being.
                            </p>
                            <p>
                                Through innovative technology and research-backed assessments, we're creating a
                                world where mental health is prioritized alongside academic success.
                            </p>
                            <div className="about-values">
                                <div className="value-item">
                                    <FontAwesomeIcon icon={faHeart} className="value-icon" />
                                    <span>Compassion First</span>
                                </div>
                                <div className="value-item">
                                    <FontAwesomeIcon icon={faUsers} className="value-icon" />
                                    <span>Student-Centered</span>
                                </div>
                                <div className="value-item">
                                    <FontAwesomeIcon icon={faShieldAlt} className="value-icon" />
                                    <span>Privacy Protected</span>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            className="about-visual"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="visual-card">
                                <div className="visual-icon">🧠</div>
                                <h3>Mental Wellness</h3>
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
                        <p>Ready to transform student wellness at your school? Reach out to us!</p>
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
                                    <p>contact@jaagrmind.com</p>
                                </div>
                            </div>
                            <div className="contact-item">
                                <div className="contact-icon">
                                    <FontAwesomeIcon icon={faPhone} />
                                </div>
                                <div>
                                    <h4>Phone</h4>
                                    <p>+91 98765 43210</p>
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
                            className="contact-form"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            onSubmit={(e) => e.preventDefault()}
                        >
                            <div className="form-group">
                                <input type="text" className="form-input" placeholder="Your Name" required />
                            </div>
                            <div className="form-group">
                                <input type="email" className="form-input" placeholder="Your Email" required />
                            </div>
                            <div className="form-group">
                                <input type="text" className="form-input" placeholder="School Name" />
                            </div>
                            <div className="form-group">
                                <textarea className="form-input" placeholder="Your Message" rows="4" required></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                                Send Message <FontAwesomeIcon icon={faArrowRight} />
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
                        <p>Empowering schools to support student mental wellness through innovative technology.</p>
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
