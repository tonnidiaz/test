import React from "react";

interface Props extends React.ButtonHTMLAttributes<{}> {loading?: boolean; label?: any}
const UButton: React.FC<Props> = ({ children, ...props }) => {
    return (
        <button type="button" {...props} className={`btn btn-sm ${props.className ?? ''}`}>
            {children ?? props.label}
        </button>
    );
};

export default UButton;
