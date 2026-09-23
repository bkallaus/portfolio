import type React from "react";
import { useState } from "react";
import type { Project, ResumeBasicInfo } from "../types";
import SectionHeading from "./SectionHeading";

type ProjectsProps = {
  resumeProjects?: Project[];
  experimentalProjects?: Project[];
  resumeBasicInfo?: ResumeBasicInfo;
}

const isExternal = (url: string) => /^https?:\/\//.test(url);

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  const external = isExternal(project.url);
  return (
    <a
      href={project.url}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:border-violet-soft hover:shadow-[0_16px_40px_-20px_rgb(91_74_134/0.45)] active:translate-y-0"
    >
      <div>
        <h3 className="flex items-center justify-between gap-3 text-xl font-semibold text-ink group-hover:text-violet transition-colors">
          <span>{project.title}</span>
          {external && (
            <>
              <i className="fas fa-arrow-up-right-from-square text-sm text-muted" aria-hidden="true"></i>
              <span className="sr-only">(opens in a new tab)</span>
            </>
          )}
        </h3>
        {project.description && (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{project.description}</p>
        )}
      </div>
      {project.technologies && project.technologies.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2">
          {project.technologies.map((tech) => (
            <li
              key={tech.name}
              className="inline-flex items-center gap-1.5 rounded-full bg-violet-tint px-3 py-1 text-xs font-medium text-ink-soft"
            >
              {tech.class && <i className={`${tech.class} text-xs`} aria-hidden="true"></i>}
              {tech.name}
            </li>
          ))}
        </ul>
      )}
    </a>
  );
};

const ProjectGrid: React.FC<{ projects: Project[] }> = ({ projects }) => (
  <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {projects.map((project) => (
      <li key={project.title}>
        <ProjectCard project={project} />
      </li>
    ))}
  </ul>
);

const Projects: React.FC<ProjectsProps> = ({
  resumeProjects,
  experimentalProjects,
  resumeBasicInfo,
}) => {
  const [showExperimental, setShowExperimental] = useState(false);
  const sectionName = resumeBasicInfo?.section_name?.projects || "Projects";

  return (
    <section id="portfolio" className="py-24 bg-pearl">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading className="mb-10">{sectionName}</SectionHeading>
        {resumeProjects && <ProjectGrid projects={resumeProjects} />}

        {experimentalProjects && experimentalProjects.length > 0 && (
          <div className="mt-12">
            <button
              type="button"
              onClick={() => setShowExperimental(!showExperimental)}
              aria-expanded={showExperimental}
              aria-controls="experimental-projects"
              className="inline-flex items-center gap-2 rounded-full border border-violet bg-white px-6 py-3 font-semibold text-violet hover:bg-violet-tint active:scale-[0.98] transition"
            >
              <span>{showExperimental ? "View Less" : "View More"}</span>
              <i
                className={`fas fa-chevron-${showExperimental ? "up" : "down"} text-sm`}
                aria-hidden="true"
              ></i>
            </button>

            {showExperimental && (
              <div id="experimental-projects" className="mt-10">
                <h3 className="mb-6 text-2xl font-semibold text-ink">Experimental Projects</h3>
                <ProjectGrid projects={experimentalProjects} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
