import type React from "react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResumeBasicInfo, SharedSkills } from "../types";
import SectionHeading from "./SectionHeading";

type SkillsProps = {
  sharedSkills: SharedSkills;
  resumeBasicInfo: ResumeBasicInfo;
}

const Skills: React.FC<SkillsProps> = ({ sharedSkills, resumeBasicInfo }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const categoryMap: Record<string, string> = {
    'TypeScript': 'Frontend',
    'JavaScript': 'Frontend',
    'React': 'Frontend',
    'NextJs': 'Frontend',
    'Java': 'Backend',
    'MySql': 'Backend',
    'PostgreSQL': 'Backend',
    'AWS': 'Cloud',
    'GCP': 'Cloud'
  };

  const categories = ['All', 'Frontend', 'Backend', 'Cloud'];

  const filteredSkills = useMemo(() => {
    if (!sharedSkills) return [];
    return sharedSkills.icons.filter(skill => {
      if (activeCategory === 'All') return true;
      return categoryMap[skill.name] === activeCategory;
    });
  }, [sharedSkills, activeCategory, categoryMap]);

  let sectionName = "Skills";
  if (resumeBasicInfo) {
    sectionName = resumeBasicInfo.section_name.skills;
  }

  return (
    <section id="skills" className="py-20 bg-haze bg-vias">
      <div className="container mx-auto px-4 text-center">
        <SectionHeading className="mb-12">
          <span>{sectionName}</span>
        </SectionHeading>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${activeCategory === category
                ? 'bg-violet text-white shadow-[0_8px_24px_-8px_rgb(109_79_209/0.6)] transform scale-105'
                : 'bg-white text-ink-soft border border-line hover:bg-[#ece2fb]'
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        <motion.ul
          layout
          className="list-none p-0 flex flex-wrap justify-center items-center gap-4 min-h-[100px]"
        >
          <AnimatePresence mode="popLayout">
            {filteredSkills.map((skill) => (
              <motion.li
                layout
                key={skill.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full border border-line shadow-[0_6px_20px_-12px_rgb(91_74_134/0.35)] hover:shadow-[0_10px_28px_-12px_rgb(91_74_134/0.5)] hover:border-violet-soft transition-all group cursor-pointer">
                  <i className={`${skill.class} colored text-2xl`}></i>
                  <span className="text-base font-semibold text-ink">{skill.name}</span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {filteredSkills.length === 0 && (
          <p className="text-muted italic mt-8">No skills found in this category.</p>
        )}
      </div>
    </section>
  );
};

export default Skills;
