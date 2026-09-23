import { listedIn, type Site, type Tech, urlFor } from "../../../../sites.ts";
import type { Project, ProjectTechnology } from "../types";

const techBadges: Record<Tech, ProjectTechnology> = {
  react: { class: "devicon-react-original", name: "React" },
  typescript: { class: "devicon-typescript-plain", name: "TypeScript" },
  javascript: { class: "devicon-javascript-plain", name: "JavaScript" },
  html5: { class: "devicon-html5-plain", name: "HTML5" },
};

export const toProject = (site: Site): Project => ({
  title: site.title,
  description: site.blurb ?? "",
  images: [],
  url: urlFor(site.slug),
  technologies: (site.tech ?? []).map((tech) => techBadges[tech]),
});

export const featuredSiteProjects: Project[] = listedIn("featured").map(toProject);

export const experimentalSiteProjects: Project[] = listedIn("experiment").map(toProject);
