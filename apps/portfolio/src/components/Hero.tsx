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
        <div className="min-h-[80vh] flex items-center bg-[#f4ecff] relative overflow-hidden">
            <img
                src="/images/hero-circuit-city.jpg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover object-[70%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#f4ecff]/90 via-[#f4ecff]/70 to-[#f4ecff]/40 md:from-[#f4ecff]/60 md:via-transparent md:to-transparent" />

            <div className="z-10 relative w-full px-6 md:px-16 lg:px-24">
                <div className="max-w-xl text-left">
                    <h1 className="text-6xl md:text-8xl font-bold text-gray-900 tracking-tight mb-6">
                        {headerData?.name || "Ben Kallaus"}
                    </h1>
                    <div className="h-12 md:h-16 flex items-center">
                        <p className="text-2xl md:text-3xl text-gray-700 font-light mb-0">
                            {typedText}<span className="animate-pulse ml-1">|</span>
                        </p>
                    </div>
                    <p className="text-xl text-gray-600 leading-relaxed mt-12">
                        Building precise, high-performance digital experiences.
                        <span className="block mt-2 text-sm uppercase tracking-widest text-gray-500 font-semibold">
                            Engineering &bull; Design &bull; Architecture
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Hero;
