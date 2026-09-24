import type React from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import type { ResumeBasicInfo, SharedSkills } from "../types";
import SectionHeading from "./SectionHeading";

type SkillsProps = {
  sharedSkills: SharedSkills;
  resumeBasicInfo: ResumeBasicInfo;
}

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

const Skills: React.FC<SkillsProps> = ({ sharedSkills, resumeBasicInfo }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredSkills = useMemo(() => {
    if (!sharedSkills) return [];
    return sharedSkills.icons.filter(skill =>
      activeCategory === 'All' || categoryMap[skill.name] === activeCategory
    );
  }, [sharedSkills, activeCategory]);

  const sectionName = resumeBasicInfo?.section_name.skills || "Skills";

  return (
    <section id="skills" className="py-24 bg-haze">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading className="mb-8">{sectionName}</SectionHeading>

        <fieldset className="flex flex-wrap gap-3 mb-10">
          <legend className="sr-only">Filter skills</legend>
          {categories.map(category => {
            const active = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-5 py-2 font-medium transition active:scale-[0.98] ${active
                  ? 'bg-violet text-white'
                  : 'border border-line bg-white text-ink-soft hover:border-violet-soft hover:text-violet'
                  }`}
              >
                {category}
              </button>
            );
          })}
        </fieldset>

        <MotionConfig reducedMotion="user">
          <motion.ul layout className="list-none p-0 flex flex-wrap gap-3 min-h-[100px]">
            <AnimatePresence mode="popLayout">
              {filteredSkills.map((skill) => (
                <motion.li
                  layout
                  key={skill.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-full border border-line bg-white px-5 py-3"
                >
                  <i className={`${skill.class} colored text-2xl`} aria-hidden="true"></i>
                  <span className="text-base font-medium text-ink">{skill.name}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </MotionConfig>

        {filteredSkills.length === 0 && (
          <p className="text-muted mt-8">No skills in this category yet.</p>
        )}
      </div>
    </section>
  );
};

export default Skills;
