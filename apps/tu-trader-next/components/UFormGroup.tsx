import React from 'react';

interface Props extends React.HTMLAttributes<{}>{label?: React.ReactNode; labelClass?: string}
const UFormGroup: React.FC<Props> = ({ label = "", labelClass = "", children, className, ...props }) => {
    return (
        <label className={"label block " + className} {...props}>
            <div className={`mb-1 ml-1 ${labelClass}`}>{label}</div>
            {children}
        </label>
    );
};

export default UFormGroup;