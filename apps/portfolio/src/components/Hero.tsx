import type React from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import type { SharedBasicInfo } from '../types';

interface HeroProps {
    headerData: SharedBasicInfo;
}

const Hero: React.FC<HeroProps> = ({ headerData }) => {
    const titles = headerData?.titles || ["Lead Software Developer"];
    const typedText = useTypewriter(titles, 100, 2000);

    return (
        <header className="min-h-[80svh] flex items-center bg-haze relative overflow-hidden pt-16">
            <img
                src="/images/hero-circuit-city.jpg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover object-[70%_center]"
            />
            <div className="absolute inset-0 bg-haze/80 md:hidden" />

            <div className="relative w-full max-w-6xl mx-auto px-6">
                <div className="max-w-xl">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-ink">
                        {headerData?.name || "Ben Kallaus"}
                    </h1>
                    <p className="sr-only">{titles.join(', ')}</p>
                    <p className="mt-4 h-10 text-2xl md:text-3xl text-ink-soft" aria-hidden="true">
                        {typedText}<span className="motion-safe:animate-pulse ml-0.5">|</span>
                    </p>
                    <p className="mt-6 text-lg text-ink-soft max-w-[40ch]">
                        Building precise, high-performance digital experiences.
                    </p>
                    <a
                        href="#portfolio"
                        className="mt-8 inline-flex items-center rounded-full bg-violet px-6 py-3 font-semibold text-white hover:bg-violet-deep active:scale-[0.98] transition"
                    >
                        View projects
                    </a>
                </div>
            </div>
        </header>
    );
};

export default Hero;
