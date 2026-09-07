import type React from "react";
import { useState } from "react";
import type { Project, ResumeBasicInfo } from "../types";

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

  const renderProjectCard = (project: Project) => (
    <div
      key={project.title}
      className="group relative overflow-hidden rounded-xl shadow-lg cursor-pointer transition-all hover:shadow-2xl bg-white border border-gray-100 flex flex-col justify-between p-6"
    >
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full flex flex-col justify-between"
      >
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors flex items-center justify-between">
            <span>{project.title}</span>
            <i className="fas fa-external-link-alt text-sm opacity-0 group-hover:opacity-100 transition-opacity"></i>
          </h3>
          {project.description && (
            <p className="text-gray-600 text-sm mb-4">{project.description}</p>
          )}
        </div>
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {project.technologies.map((tech) => (
              <span
                key={tech.name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
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
    <section id="portfolio" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-900">
          <span>{sectionName}</span>
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {resumeProjects?.map((project) => renderProjectCard(project))}
        </div>

        {experimentalProjects && experimentalProjects.length > 0 && (
          <div className="mt-12 text-center max-w-6xl mx-auto">
            <button
              type="button"
              onClick={() => setShowExperimental(!showExperimental)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <span>{showExperimental ? "View Less" : "View More"}</span>
              <i
                className={`fas fa-chevron-${showExperimental ? "up" : "down"} text-sm transition-transform duration-300`}
              ></i>
            </button>

            {showExperimental && (
              <div className="mt-10 text-left">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  Experimental Projects
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {experimentalProjects.map((project) => renderProjectCard(project))}
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
