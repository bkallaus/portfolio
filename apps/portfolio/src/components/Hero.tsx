import React from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { SharedBasicInfo } from '../types';

interface HeroProps {
    headerData: SharedBasicInfo;
}

const Hero: React.FC<HeroProps> = ({ headerData }) => {
    const titles = headerData?.titles || ["Lead Software Developer"];
    const typedText = useTypewriter(titles, 100, 2000);

    return (
        <div className="min-h-[80vh] flex flex-col justify-center items-center bg-gray-50 text-center px-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                <iframe
                    src="https://ben.kallaus.me/simple-city"
                    title="Simple City Visualization"
                    className="w-full h-full border-0"
                />
            </div>

            <div className="z-10 max-w-4xl relative p-10 rounded-xl bg-white/5 backdrop-blur-md shadow-lg border border-white/20">
                <h1 className="text-6xl md:text-8xl font-bold text-gray-900 tracking-tight mb-6">
                    {headerData?.name || "Ben Kallaus"}
                </h1>
                <div className="h-12 md:h-16 flex items-center justify-center"> {/* Fixed height for typing stability */}
                    <p className="text-2xl md:text-3xl text-gray-600 font-light mb-0">
                        {typedText}<span className="animate-pulse ml-1">|</span>
                    </p>
                </div>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mt-12">
                    Building precise, high-performance digital experiences.
                    <span className="block mt-2 text-sm uppercase tracking-widest text-gray-400 font-semibold">
                        Engineering &bull; Design &bull; Architecture
                    </span>
                </p>
            </div>
        </div>
    );
};

export default Hero;
