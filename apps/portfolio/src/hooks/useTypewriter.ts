import { useState, useEffect } from 'react';

export const useTypewriter = (text: string | string[], speed = 150, delay = 1000) => {
    const [displayText, setDisplayText] = useState('');
    const [index, setIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        // Determine current typing speed
        let currentSpeed = speed;
        if (isDeleting) currentSpeed /= 2;

        const timeout = setTimeout(() => {
            // Determine target text (single string or current item in array)
            const currentFullText = Array.isArray(text) ? text[index % text.length] : text;

            if (!isDeleting) {
                // Typing
                setDisplayText(currentFullText.substring(0, displayText.length + 1));

                // Finished typing
                if (displayText.length === currentFullText.length) {
                    setTimeout(() => setIsDeleting(true), delay);
                }
            } else {
                // Deleting
                setDisplayText(currentFullText.substring(0, displayText.length - 1));

                // Finished deleting
                if (displayText.length === 0) {
                    setIsDeleting(false);
                    if (Array.isArray(text)) {
                        setIndex((prev) => prev + 1);
                    }
                }
            }
        }, currentSpeed);

        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, index, speed, delay, text]);

    return displayText;
};
