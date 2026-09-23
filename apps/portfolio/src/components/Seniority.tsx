
import { FaServer, FaUsers, FaRocket } from 'react-icons/fa';
import { accentColor } from './pastel';

const Seniority = () => {
    const pillars = [
        {
            title: "System Architecture",
            icon: <FaServer />,
            description: "Designing scalable, resilient, and maintainable frontend architectures. Expertise in micro-frontends, state management strategies, and performance optimization at scale."
        },
        {
            title: "Technical Leadership",
            icon: <FaUsers />,
            description: "Mentoring engineers, driving technical decisions, and fostering a culture of code quality. Experienced in code reviews, RFC processes, and setting engineering standards."
        },
        {
            title: "Product Engineering",
            icon: <FaRocket />,
            description: "Bridging the gap between code and product value. I focus on user-centric development, accessibility, and translating complex requirements into elegant technical solutions."
        }
    ];

    return (
        <section id="seniority" className="py-20 bg-blush bg-vias">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-ink tracking-tight mb-4">Engineering Approach</h2>
                    <p className="text-xl text-ink-soft max-w-2xl mx-auto">
                        Beyond just writing code, I bring a senior mindset focused on long-term value, stability, and team velocity.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {pillars.map((pillar, index) => (
                        <div key={pillar.title} className="relative overflow-hidden bg-white/85 backdrop-blur-sm p-8 rounded-xl border border-line shadow-[0_8px_30px_-16px_rgb(91_74_134/0.3)] hover:shadow-[0_16px_40px_-16px_rgb(91_74_134/0.4)] hover:-translate-y-1 transition-all">
                            <div className="absolute inset-x-0 top-0 h-1" style={{ background: accentColor(index) }} />
                            <div className="flex justify-center mb-6">
                                <div className="text-3xl w-16 h-16 rounded-2xl flex items-center justify-center text-ink" style={{ background: `${accentColor(index)}33` }}>{pillar.icon}</div>
                            </div>
                            <h3 className="text-2xl font-bold text-ink mb-4 text-center">{pillar.title}</h3>
                            <p className="text-ink-soft leading-relaxed text-center">
                                {pillar.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Seniority;
