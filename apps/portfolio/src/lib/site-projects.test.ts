import { experimentalSiteProjects, featuredSiteProjects, toProject } from "./site-projects";

describe("site projects", () => {
  it("links a site to its URL segment and badges its tech", () => {
    const project = toProject({ slug: "demo", title: "Demo", tech: ["react", "typescript"] });
    expect(project.url).toBe("/demo/");
    expect(project.technologies.map((tech) => tech.name)).toEqual(["React", "TypeScript"]);
  });

  it("never lists the hub itself", () => {
    const urls = [...featuredSiteProjects, ...experimentalSiteProjects].map((p) => p.url);
    expect(urls).not.toContain("/");
  });
});
