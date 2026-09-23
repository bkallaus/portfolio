import type React from 'react';

type SectionHeadingProps = {
    children: React.ReactNode;
    className?: string;
};

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, className = '' }) => (
    <div className={`flex flex-col items-center ${className}`}>
        <h1 className="text-4xl font-bold text-center text-ink tracking-tight">{children}</h1>
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full border-2 border-trace-pink bg-white" />
            <span className="h-0.5 w-20 rounded-full bg-trace" />
            <span className="h-2 w-2 rounded-full border-2 border-trace-mint bg-white" />
        </div>
    </div>
);

export default SectionHeading;
