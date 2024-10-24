import React from 'react';

const TuCard: React.FC<React.HTMLAttributes<{}> & {header: React.ReactNode}> = ({ header, children }) => {
    return (
        <div className="card">
            {header}
            <div className="devider mb-3"></div>
            {children}
        </div>
    );
};

export default TuCard;