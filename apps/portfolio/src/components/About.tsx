import type React from "react";
import type { ResumeBasicInfo, SharedBasicInfo } from "../types";
import SectionHeading from "./SectionHeading";

type AboutProps = {
  resumeBasicInfo: ResumeBasicInfo;
  sharedBasicInfo: SharedBasicInfo;
}

const About: React.FC<AboutProps> = ({ resumeBasicInfo, sharedBasicInfo }) => {
  let about: string | undefined;
  let hello: string | undefined;
  let profilepic: string | undefined;
  let sectionName: string | undefined;

  if (sharedBasicInfo) {
    profilepic = `images/${sharedBasicInfo.image}`;
  }
  if (resumeBasicInfo) {
    sectionName = resumeBasicInfo.section_name.about;
    hello = resumeBasicInfo.description_header;
    about = resumeBasicInfo.description;
  }

  return (
    <section id="about" className="py-20 bg-gradient-to-b from-haze to-pearl">
      <div className="container mx-auto px-4">
        <SectionHeading className="mb-16">
          <span>{sectionName}</span>
        </SectionHeading>
        <div className="flex flex-col md:flex-row items-center justify-center gap-12">
          <div className="md:w-1/3 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffc8dd] via-[#cdb4db] to-[#a2d2ff] rounded-lg transform rotate-6 scale-105 z-0"></div>
              <div className="relative z-10 bg-white p-2 rounded-lg shadow-[0_12px_40px_-12px_rgb(91_74_134/0.35)]">
                <img
                  src={profilepic}
                  alt="Avatar placeholder"
                  className="w-64 h-auto rounded object-cover"
                />
              </div>
            </div>
          </div>

          <div className="md:w-2/3 max-w-2xl">
            <div className="bg-white rounded-xl shadow-[0_12px_40px_-16px_rgb(91_74_134/0.3)] border border-line overflow-hidden">
              <div className="bg-haze border-b border-line px-4 py-2 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-trace-pink"></div>
                <div className="w-3 h-3 rounded-full bg-trace-gold"></div>
                <div className="w-3 h-3 rounded-full bg-trace-mint"></div>
              </div>

              <div className="p-8">
                <p className="text-2xl font-light mb-6 text-ink">
                  {hello}
                </p>
                <div className="text-ink-soft leading-relaxed text-lg">
                  {about}
                </div>

                <div className="mt-8 flex gap-6 justify-center md:justify-start">
                  {sharedBasicInfo?.social?.map((network) => (
                    <a
                      key={network.name}
                      href={network.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-violet transition-colors text-2xl"
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
