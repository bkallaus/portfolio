import type React from 'react';

type SectionHeadingProps = {
    children: React.ReactNode;
    className?: string;
};

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, className = '' }) => (
    <h2 className={`text-3xl md:text-4xl font-semibold tracking-tight text-ink ${className}`}>{children}</h2>
);

export default SectionHeading;
