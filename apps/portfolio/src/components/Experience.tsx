import React from "react";
import { Experience as ExperienceType, ResumeBasicInfo } from "../types";

type ExperienceProps = {
  resumeExperience: ExperienceType[];
  resumeBasicInfo: ResumeBasicInfo;
}

const Experience: React.FC<ExperienceProps> = ({ resumeExperience, resumeBasicInfo }) => {
  if (!resumeExperience || !resumeBasicInfo) {
    return null;
  }

  const experience = resumeExperience.map((work) => {
    return (
      <div key={work.title} className="mb-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{work.title}</h3>
            <h4 className="text-lg text-primary font-medium">{work.company}</h4>
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full mt-2 md:mt-0">{work.years}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {work.technologies && work.technologies.map((tech, i) => (
            <span key={i} className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">{tech}</span>
          ))}
        </div>
      </div>
    );
  });

  return (
    <section id="experience" className="py-16 container mx-auto px-4">
      <h1 className="text-4xl font-bold text-center mb-12 text-gray-900">Experience</h1>
      <div className="max-w-4xl mx-auto space-y-8">
        {experience}
      </div>
    </section>
  );
};

export default Experience;
