import React from "react";
import { ResumeBasicInfo, SharedBasicInfo } from "../types";

type AboutProps = {
  resumeBasicInfo: ResumeBasicInfo;
  sharedBasicInfo: SharedBasicInfo;
}

const About: React.FC<AboutProps> = ({ resumeBasicInfo, sharedBasicInfo }) => {
  let about;
  let hello;
  let profilepic;
  let sectionName;

  if (sharedBasicInfo) {
    profilepic = "images/" + sharedBasicInfo.image;
  }
  if (resumeBasicInfo) {
    sectionName = resumeBasicInfo.section_name.about;
    hello = resumeBasicInfo.description_header;
    about = resumeBasicInfo.description;
  }

  return (
    <section id="about" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-16 text-gray-900">
          <span>{sectionName}</span>
        </h1>
        <div className="flex flex-col md:flex-row items-center justify-center gap-12">
          {/* Profile Image */}
          <div className="md:w-1/3 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gray-200 rounded-lg transform rotate-6 scale-105 z-0"></div>
              <div className="relative z-10 bg-white p-2 rounded-lg shadow-lg">
                <img
                  src={profilepic}
                  alt="Avatar placeholder"
                  className="w-64 h-auto rounded object-cover"
                />
              </div>
            </div>
          </div>

          {/* About Text */}
          <div className="md:w-2/3 max-w-2xl">
            <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Windows/Mac-like header */}
              <div className="bg-gray-200 px-4 py-2 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>

              <div className="p-8">
                <p className="text-2xl font-light mb-6 text-gray-800">
                  {hello}
                </p>
                <div className="text-gray-600 leading-relaxed text-lg">
                  {about}
                </div>

                <div className="mt-8 flex gap-6 justify-center md:justify-start">
                  {sharedBasicInfo?.social?.map((network) => (
                    <a
                      key={network.name}
                      href={network.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-800 transition-colors text-2xl"
                    >
                      <i className={network.class}></i>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
