import { render, screen } from "@testing-library/react";
import Experience from "./Experience";
import { Experience as ExperienceType, ResumeBasicInfo } from "../types";

describe("Experience", () => {
  const mockBasicInfo: ResumeBasicInfo = {
    description_header: "Header",
    description: "Description",
    section_name: {
      about: "About",
      projects: "Projects",
      skills: "Skills",
      experience: "Experience"
    }
  };

  const mockExperiences: ExperienceType[] = [
    {
      company: "Claimable",
      title: "Software Engineer",
      years: "08/31/2024 - present",
      mainTech: [],
      technologies: []
    },
    {
      company: "Tractor Zoom",
      title: "Lead Software Developer",
      years: "05/2021 - 08/2024",
      mainTech: [""],
      technologies: ["Typescript", "React"]
    }
  ];

  it("renders experiences correctly", () => {
    render(<Experience resumeExperience={mockExperiences} resumeBasicInfo={mockBasicInfo} />);

    expect(screen.getByText("Claimable")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("08/31/2024 - present")).toBeInTheDocument();

    expect(screen.getByText("Tractor Zoom")).toBeInTheDocument();
    expect(screen.getByText("Lead Software Developer")).toBeInTheDocument();
    expect(screen.getByText("05/2021 - 08/2024")).toBeInTheDocument();
    expect(screen.getByText("Typescript")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("does not crash or render null if basic info or experience is missing", () => {
    const { container } = render(<Experience resumeExperience={[]} resumeBasicInfo={mockBasicInfo} />);
    expect(container.querySelector("#experience")).toBeInTheDocument();
  });
});
