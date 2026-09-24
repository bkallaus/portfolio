import type React from "react";
import type { Experience as ExperienceType, ResumeBasicInfo } from "../types";
import SectionHeading from "./SectionHeading";

type ExperienceProps = {
  resumeExperience: ExperienceType[];
  resumeBasicInfo: ResumeBasicInfo;
}

const Experience: React.FC<ExperienceProps> = ({ resumeExperience, resumeBasicInfo }) => {
  if (!resumeExperience || !resumeBasicInfo) {
    return null;
  }

  return (
    <section id="experience" className="py-24 bg-pearl">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading className="mb-10">Experience</SectionHeading>
        <ol className="max-w-4xl divide-y divide-line border-y border-line">
          {resumeExperience.map((work) => (
            <li
              key={`${work.company}-${work.title}`}
              className="grid gap-2 py-8 md:grid-cols-[12rem_1fr] md:gap-8"
            >
              <p className="text-sm font-medium text-muted md:pt-1">{work.years}</p>
              <div>
                <h3 className="text-xl font-semibold text-ink">{work.title}</h3>
                <p className="mt-1 font-medium text-violet">{work.company}</p>
                {work.technologies && work.technologies.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {work.technologies.map((tech) => (
                      <li key={tech} className="rounded-full bg-violet-tint px-3 py-1 text-xs font-medium text-ink-soft">
                        {tech}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default Experience;
