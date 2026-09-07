import React from "react";
import { Project, ResumeBasicInfo } from "../types";

type ProjectsProps = {
  resumeProjects: Project[];
  resumeBasicInfo: ResumeBasicInfo;
}

const Projects: React.FC<ProjectsProps> = ({ resumeProjects, resumeBasicInfo }) => {
  let sectionName = "Projects";
  let projects: React.ReactElement[] = [];

  if (resumeBasicInfo) {
    sectionName = resumeBasicInfo.section_name.projects;
  }

  if (resumeProjects) {
    projects = resumeProjects.map((project) => (
      <div
        key={project.title}
        className="group relative overflow-hidden rounded-xl shadow-lg cursor-pointer transition-all hover:shadow-2xl bg-white"
      >
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full w-full"
        >
          <div className="p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {project.title} <i className="fas fa-external-link-alt text-sm ml-2 opacity-0 group-hover:opacity-100 transition-opacity"></i>
              </h3>
            </div>
          </div>
        </a>
      </div>
    ));
  }

  return (
    <section id="portfolio" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-900">
          <span>{sectionName}</span>
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {projects}
        </div>
      </div>
    </section>
  );
};

export default Projects;
