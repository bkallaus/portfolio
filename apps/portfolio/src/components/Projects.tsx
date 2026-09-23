import type React from "react";
import { useState } from "react";
import type { Project, ResumeBasicInfo } from "../types";
import { accentColor, chipClass } from "./pastel";
import SectionHeading from "./SectionHeading";

type ProjectsProps = {
  resumeProjects?: Project[];
  experimentalProjects?: Project[];
  resumeBasicInfo?: ResumeBasicInfo;
}

const Projects: React.FC<ProjectsProps> = ({
  resumeProjects,
  experimentalProjects,
  resumeBasicInfo,
}) => {
  const [showExperimental, setShowExperimental] = useState(false);

  let sectionName = "Projects";
  if (resumeBasicInfo?.section_name?.projects) {
    sectionName = resumeBasicInfo.section_name.projects;
  }

  const renderProjectCard = (project: Project, index: number) => (
    <div
      key={project.title}
      className="group relative overflow-hidden rounded-xl cursor-pointer transition-all bg-white border border-line shadow-[0_8px_30px_-16px_rgb(91_74_134/0.3)] hover:shadow-[0_18px_44px_-16px_rgb(91_74_134/0.45)] hover:-translate-y-1 flex flex-col justify-between p-6"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accentColor(index) }} />
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full flex flex-col justify-between"
      >
        <div>
          <h3 className="text-xl font-bold text-ink mb-2 group-hover:text-violet transition-colors flex items-center justify-between">
            <span>{project.title}</span>
            <i className="fas fa-external-link-alt text-sm opacity-0 group-hover:opacity-100 transition-opacity"></i>
          </h3>
          {project.description && (
            <p className="text-ink-soft text-sm mb-4">{project.description}</p>
          )}
        </div>
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {project.technologies.map((tech, i) => (
              <span
                key={tech.name}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${chipClass(i)}`}
              >
                {tech.class && <i className={`${tech.class} text-xs`}></i>}
                {tech.name}
              </span>
            ))}
          </div>
        )}
      </a>
    </div>
  );

  return (
    <section id="portfolio" className="py-20 bg-pearl">
      <div className="container mx-auto px-4">
        <SectionHeading className="mb-12">
          <span>{sectionName}</span>
        </SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {resumeProjects?.map(renderProjectCard)}
        </div>

        {experimentalProjects && experimentalProjects.length > 0 && (
          <div className="mt-12 text-center max-w-6xl mx-auto">
            <button
              type="button"
              onClick={() => setShowExperimental(!showExperimental)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-ink bg-gradient-to-r from-[#ffc8dd] via-[#e2c2ff] to-[#bde0fe] hover:brightness-105 transition-all shadow-[0_8px_24px_-10px_rgb(91_74_134/0.45)] focus:outline-none focus:ring-2 focus:ring-violet focus:ring-offset-2 cursor-pointer"
            >
              <span>{showExperimental ? "View Less" : "View More"}</span>
              <i
                className={`fas fa-chevron-${showExperimental ? "up" : "down"} text-sm transition-transform duration-300`}
              ></i>
            </button>

            {showExperimental && (
              <div className="mt-10 text-left">
                <h2 className="text-2xl font-bold text-ink mb-6 text-center">
                  Experimental Projects
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {experimentalProjects.map(renderProjectCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
