import React from 'react';

interface LogoProps {
    isCollapsed?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ isCollapsed }) => (
    <div className="flex items-center space-x-3">
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path d="M31,4H17C15.3431,4,14,5.34315,14,7V10H34V7C34,5.34315,32.6569,4,31,4Z" className="fill-accent"/>
            <path d="M38,10H10C7.79086,10,6,11.7909,6,14V40C6,42.2091,7.79086,44,10,44H38C40.2091,44,42,42.2091,42,40V14C42,11.7909,40.2091,10,38,10Z" className="fill-pink-accent"/>
            <path d="M38,10H10C7.79086,10,6,11.7909,6,14V40C6,42.2091,7.79086,44,10,44H38C40.2091,44,42,42.2091,42,40V14C42,11.7909,40.2091,10,38,10Z" className="stroke-accent" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M31,4H17C15.3431,4,14,5.34315,14,7V10H34V7C34,5.34315,32.6569,4,31,4Z" className="stroke-accent" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="17" cy="24" r="2" className="fill-accent"/>
            <circle cx="31" cy="24" r="2" className="fill-accent"/>
            <path d="M17,32C18,34,22,35,24,35C26,35,30,34,31,32" className="stroke-accent" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {!isCollapsed && <span className="text-2xl font-bold text-text-main whitespace-nowrap">ClipBoard+</span>}
    </div>
);