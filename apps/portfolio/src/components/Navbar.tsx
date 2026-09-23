import { useEffect, useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';

const navLinks = [
    { name: 'About', href: '#about' },
    { name: 'Projects', href: '#portfolio' },
    { name: 'Skills', href: '#skills' },
    { name: 'Experience', href: '#experience' },
];

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const solid = scrolled || open;

    return (
        <nav
            aria-label="Main"
            className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid ? 'bg-pearl border-b border-line' : 'bg-transparent border-b border-transparent'}`}
        >
            <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
                <a href="#top" className="font-bold text-xl tracking-tight text-ink">
                    BK
                </a>
                <ul className="hidden md:flex gap-8">
                    {navLinks.map((link) => (
                        <li key={link.name}>
                            <a href={link.href} className="font-medium text-ink-soft hover:text-violet transition-colors">
                                {link.name}
                            </a>
                        </li>
                    ))}
                </ul>
                <button
                    type="button"
                    className="md:hidden -mr-2 p-2 text-ink text-xl"
                    aria-expanded={open}
                    aria-controls="mobile-menu"
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    onClick={() => setOpen(!open)}
                >
                    {open ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
                </button>
            </div>
            {open && (
                <ul id="mobile-menu" className="md:hidden border-t border-line px-6 py-2">
                    {navLinks.map((link) => (
                        <li key={link.name}>
                            <a
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="block py-3 font-medium text-ink-soft hover:text-violet"
                            >
                                {link.name}
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </nav>
    );
};

export default Navbar;
