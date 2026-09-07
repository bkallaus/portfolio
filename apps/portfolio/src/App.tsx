import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Seniority from "./components/Seniority";
import Footer from "./components/Footer";
import About from "./components/About";
import Experience from "./components/Experience";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import { PortfolioSharedData, ResumeData } from "./types";

export const App = () => {
  const [sharedData, setSharedBasicInfo] = useState<PortfolioSharedData>({} as PortfolioSharedData);
  const [resumeData, setResumeData] = useState<ResumeData>({} as ResumeData);

  useEffect(() => {
    const loadSharedData = () => {
      fetch(`portfolio_shared_data.json`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }).then(async (data) => {
        const json = await data.json();
        setSharedBasicInfo(json);
      });
    };

    const loadResumeFromPath = () => {
      fetch(`res_primaryLanguage.json`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }).then(async (data) => {
        const json = await data.json();
        setResumeData(json);
      });
    };

    loadSharedData();
    loadResumeFromPath();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <Hero headerData={sharedData.basic_info} />
      <About
        resumeBasicInfo={resumeData.basic_info}
        sharedBasicInfo={sharedData.basic_info}
      />
      <Seniority />
      <Projects
        resumeProjects={resumeData.projects}
        resumeBasicInfo={resumeData.basic_info}
      />
      <Skills
        sharedSkills={sharedData.skills}
        resumeBasicInfo={resumeData.basic_info}
      />
      <Experience
        resumeExperience={resumeData.experience}
        resumeBasicInfo={resumeData.basic_info}
      />
      <Footer sharedBasicInfo={sharedData.basic_info} />
    </div>
  );
}


export default App;
