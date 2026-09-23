import { FaRocket, FaServer, FaUsers } from 'react-icons/fa';
import SectionHeading from './SectionHeading';

const pillars = [
    {
        title: "System Architecture",
        icon: FaServer,
        description: "Designing scalable, resilient, and maintainable frontend architectures. Expertise in micro-frontends, state management strategies, and performance optimization at scale."
    },
    {
        title: "Technical Leadership",
        icon: FaUsers,
        description: "Mentoring engineers, driving technical decisions, and fostering a culture of code quality. Experienced in code reviews, RFC processes, and setting engineering standards."
    },
    {
        title: "Product Engineering",
        icon: FaRocket,
        description: "Bridging the gap between code and product value. I focus on user-centric development, accessibility, and translating complex requirements into elegant technical solutions."
    }
];

const Seniority = () => (
    <section id="seniority" className="py-24 bg-blush">
        <div className="max-w-6xl mx-auto px-6 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-16">
            <div>
                <SectionHeading>Engineering Approach</SectionHeading>
                <p className="mt-4 text-lg leading-relaxed text-ink-soft max-w-[45ch]">
                    Beyond just writing code, I bring a senior mindset focused on long-term value, stability, and team velocity.
                </p>
            </div>
            <ul className="divide-y divide-line">
                {pillars.map(({ title, icon: Icon, description }) => (
                    <li key={title} className="flex gap-5 py-6 first:pt-0 last:pb-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-tint text-xl text-violet">
                            <Icon aria-hidden="true" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-ink">{title}</h3>
                            <p className="mt-2 leading-relaxed text-ink-soft">{description}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </section>
);

export default Seniority;
