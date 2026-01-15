import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import CrowBackground from '../ui/CrowBackground';

const pageTransition = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.98,
    transition: { duration: 0.2 }
  }
};

export default function Layout({ children, moduleClass = '' }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`min-h-screen ${moduleClass || 'bg-zinc-950'} relative overflow-hidden`}>
      {/* Fondo animado con cuervo */}
      <CrowBackground />
      
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 256 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen relative z-10"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={moduleClass}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-screen"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
