import React, { useState, useEffect } from 'react';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 50;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [scrolled]);

    const navLinks = [
        { name: 'About', href: '#about' },
        { name: 'Projects', href: '#portfolio' },
        { name: 'Skills', href: '#skills' },
        { name: 'Experience', href: '#experience' },
    ];

    return (
        <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
            <div className="container mx-auto px-6 flex justify-between items-center">
                <div className={`font-bold text-xl ${scrolled ? 'text-gray-800' : 'text-blue-900'} transition-colors`}>
                    BK
                </div>
                <div className="hidden md:flex space-x-6">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className={`font-medium ${scrolled ? 'text-gray-600 hover:text-blue-600' : 'text-blue-800 hover:text-blue-600'} transition-colors`}
                        >
                            {link.name}
                        </a>
                    ))}
                </div>
                {/* Mobile menu button could go here */}
            </div>
        </nav>
    );
};

export default Navbar;
