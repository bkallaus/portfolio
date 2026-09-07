import React from 'react';
import { FaServer, FaUsers, FaRocket } from 'react-icons/fa';

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
        <section id="seniority" className="py-20 bg-gray-50 border-t border-gray-200">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Engineering Approach</h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Beyond just writing code, I bring a senior mindset focused on long-term value, stability, and team velocity.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {pillars.map((pillar, index) => (
                        <div key={index} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="text-5xl mb-6 text-blue-600 flex justify-center">{pillar.icon}</div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">{pillar.title}</h3>
                            <p className="text-gray-600 leading-relaxed text-center">
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
