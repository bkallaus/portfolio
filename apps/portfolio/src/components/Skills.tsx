import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResumeBasicInfo, SharedSkills } from "../types";

type SkillsProps = {
  sharedSkills: SharedSkills;
  resumeBasicInfo: ResumeBasicInfo;
}

const Skills: React.FC<SkillsProps> = ({ sharedSkills, resumeBasicInfo }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  // Manual categorization mapping since JSON is flat
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
  }, [sharedSkills, activeCategory]);

  let sectionName = "Skills";
  if (resumeBasicInfo) {
    sectionName = resumeBasicInfo.section_name.skills;
  }

  return (
    <section id="skills" className="py-20 bg-gray-100">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold mb-12 text-gray-900">
          <span>{sectionName}</span>
        </h1>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${activeCategory === category
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-200'
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
                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group cursor-pointer">
                  <i className={`${skill.class} colored text-2xl`}></i>
                  <span className="text-base font-semibold text-gray-700">{skill.name}</span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {filteredSkills.length === 0 && (
          <p className="text-gray-500 italic mt-8">No skills found in this category.</p>
        )}
      </div>
    </section>
  );
};

export default Skills;
