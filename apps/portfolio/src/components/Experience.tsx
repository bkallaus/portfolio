import type React from "react";
import type { Experience as ExperienceType, ResumeBasicInfo } from "../types";
import { accentColor, chipClass } from "./pastel";
import SectionHeading from "./SectionHeading";

type ExperienceProps = {
  resumeExperience: ExperienceType[];
  resumeBasicInfo: ResumeBasicInfo;
}

const Experience: React.FC<ExperienceProps> = ({ resumeExperience, resumeBasicInfo }) => {
  if (!resumeExperience || !resumeBasicInfo) {
    return null;
  }

  const experience = resumeExperience.map((work, index) => {
    return (
      <div key={`${work.company}-${work.title}`} className="relative overflow-hidden mb-8 p-6 pl-8 border border-line rounded-xl bg-white shadow-[0_8px_30px_-16px_rgb(91_74_134/0.3)] hover:shadow-[0_16px_40px_-16px_rgb(91_74_134/0.4)] transition-shadow">
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: accentColor(index) }} />
        <div className="flex flex-col md:flex-row justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-ink">{work.title}</h3>
            <h4 className="text-lg text-violet font-medium">{work.company}</h4>
          </div>
          <span className="text-sm text-ink-soft bg-haze border border-line px-3 py-1 rounded-full mt-2 md:mt-0">{work.years}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {work.technologies?.map((tech, i) => (
            <span key={i} className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded ${chipClass(i)}`}>{tech}</span>
          ))}
        </div>
      </div>
    );
  });

  return (
    <section id="experience" className="py-20 bg-gradient-to-b from-pearl to-blush px-4">
      <SectionHeading className="mb-12">Experience</SectionHeading>
      <div className="max-w-4xl mx-auto space-y-8">
        {experience}
      </div>
    </section>
  );
};

export default Experience;
