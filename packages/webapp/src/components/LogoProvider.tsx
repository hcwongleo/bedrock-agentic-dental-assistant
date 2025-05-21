import React from 'react';
import Frame from 'react-frame-component';
import dentalLogo from '../assets/mortgage.png';

interface LogoProviderProps {
    content: string;
}

export const LogoProvider: React.FC<LogoProviderProps> = ({ content }) => {
    const contentWithLogo = content.replace(
        'src="mortgage.png"',
        `src="${dentalLogo}"`
    );

    return (
        <Frame
            style={{
                width: "100%",
                minHeight: "80vh",
                maxHeight: "100vh",
                border: "none",
                backgroundColor: "white",
                overflow: "auto"
            }}
            initialContent={contentWithLogo}
        >
            <div />
        </Frame>
    );
};
