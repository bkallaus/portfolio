import type React from "react";
import type { ResumeBasicInfo, SharedBasicInfo } from "../types";
import SectionHeading from "./SectionHeading";

type AboutProps = {
  resumeBasicInfo: ResumeBasicInfo;
  sharedBasicInfo: SharedBasicInfo;
}

const About: React.FC<AboutProps> = ({ resumeBasicInfo, sharedBasicInfo }) => {
  const profilepic = sharedBasicInfo ? `images/${sharedBasicInfo.image}` : undefined;
  const name = sharedBasicInfo?.name || "Ben Kallaus";

  return (
    <section id="about" className="py-24 bg-pearl">
      <div className="max-w-6xl mx-auto px-6 grid gap-12 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-16 items-start">
        {profilepic && (
          <img
            src={profilepic}
            alt={`Portrait of ${name}`}
            className="w-56 md:w-full aspect-[4/5] rounded-2xl object-cover shadow-[0_16px_40px_-20px_rgb(91_74_134/0.45)]"
          />
        )}
        <div className="max-w-[65ch]">
          <SectionHeading>{resumeBasicInfo?.section_name.about}</SectionHeading>
          <p className="mt-6 text-2xl text-ink">{resumeBasicInfo?.description_header}</p>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{resumeBasicInfo?.description}</p>
          {sharedBasicInfo?.social && sharedBasicInfo.social.length > 0 && (
            <ul className="mt-8 flex gap-3">
              {sharedBasicInfo.social.map((network) => (
                <li key={network.name}>
                  <a
                    href={network.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-xl text-ink-soft hover:border-violet-soft hover:text-violet transition-colors"
                  >
                    <i className={network.class} aria-hidden="true"></i>
                    <span className="sr-only">{network.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default About;
