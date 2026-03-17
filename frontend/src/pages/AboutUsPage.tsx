import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, ShieldCheck, Zap, Globe, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import './AboutUsPage.css';

const AboutUsPage: React.FC = () => {
  return (
    <div className="about-page">
      <div className="hero-glow" />
      
      <section className="about-hero">
        <motion.h1 
          className="about-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Advancing the <br /> Circular Economy
        </motion.h1>
        <motion.p 
          className="about-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Eco-Exchange is a premium marketplace designed for conscious consumers who value sustainability as much as quality. We are redefining ownership through exchange.
        </motion.p>
      </section>

      <section className="about-grid">
        <motion.div 
          className="about-card glass"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-icon">
            <Leaf size={32} />
          </div>
          <h3 className="card-title">Eco-Centric</h3>
          <p className="card-desc">Every transaction on our platform reduces waste and promotes the reuse of high-quality goods, minimizing our collective footprint.</p>
        </motion.div>

        <motion.div 
          className="about-card glass"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-icon">
            <ShieldCheck size={32} />
          </div>
          <h3 className="card-title">Verified Quality</h3>
          <p className="card-desc">Our AI-driven inspection system ensures that every item listed meets our premium standards for condition and authenticity.</p>
        </motion.div>

        <motion.div 
          className="about-card glass"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-icon">
            <Zap size={32} />
          </div>
          <h3 className="card-title">Smart Matching</h3>
          <p className="card-desc">Using advanced algorithms, we match your unwanted items with exactly what others are looking for, creating seamless exchanges.</p>
        </motion.div>
      </section>

      <section className="mission-section">
        <motion.div 
          className="mission-image"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <img src="/images/hero.png" alt="Sustainable Marketplace" />
        </motion.div>
        <div className="mission-content">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Our Mission
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            To create a world where luxury and sustainability coexist. We believe that the most premium products are those that last multiple lifetimes, passing from one steward to another.
          </motion.p>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div className="stat-item">
              <Globe size={24} color="var(--accent-emerald)" />
              <div>
                <strong>Global Reach</strong>
                <p>Scaling sustainability worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mission-section" style={{ direction: 'rtl' }}>
        <motion.div 
          className="mission-image"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <img src="/images/mission.png" alt="Circular Economy" />
        </motion.div>
        <div className="mission-content" style={{ direction: 'ltr' }}>
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Community Driven
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Eco-Exchange is more than just a platform; it's a community of like-minded individuals who believe in conscious consumption and the power of sharing resources.
          </motion.p>
          <div className="stat-item">
            <Users size={24} color="var(--accent-emerald)" />
            <div>
              <strong>10k+ Members</strong>
              <p>And growing every day</p>
            </div>
          </div>
        </div>
      </section>

      <motion.section 
        className="cta-section"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
      >
        <h2 className="cta-title">Ready to start your journey?</h2>
        <p className="cta-desc">Join thousands of others in the sustainable exchange revolution.</p>
        <Link to="/register" className="btn-cta">
          Get Started <Zap size={18} fill="currentColor" />
        </Link>
      </motion.section>
    </div>
  );
};

export default AboutUsPage;
