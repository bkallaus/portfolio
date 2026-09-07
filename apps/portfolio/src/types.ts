export type Social = {
    name: string;
    url: string;
    class: string;
}

export type SharedBasicInfo = {
    name: string;
    titles: string[];
    social: Social[];
    image: string;
}

export type SkillIcon = {
    name: string;
    class: string;
    level: string;
}

export type SharedSkills = {
    icons: SkillIcon[];
}

export type PortfolioSharedData = {
    basic_info: SharedBasicInfo;
    skills: SharedSkills;
}

export type SectionNames = {
    about: string;
    projects: string;
    skills: string;
    experience: string;
}

export type ResumeBasicInfo = {
    description_header: string;
    description: string;
    section_name: SectionNames;
}

export type ProjectTechnology = {
    class: string;
    name: string;
}

export type Project = {
    title: string;
    description: string;
    images: string[];
    url: string;
    technologies: ProjectTechnology[];
    startDate?: string;
}

export type Experience = {
    company: string;
    title: string;
    years: string;
    mainTech: string[];
    technologies: string[];
}

export type ResumeData = {
    basic_info: ResumeBasicInfo;
    projects: Project[];
    experience: Experience[];
}
