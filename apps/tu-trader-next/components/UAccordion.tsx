import React, { DetailsHTMLAttributes } from "react";

interface Props extends DetailsHTMLAttributes<{}> {
    children: React.ReactNode; label: React.ReactNode
}
const UAccordion: React.FC<Props> = ({ children, label }) => {
    return (
        <details className="collapse collapse-arrow border border-card bg-base-100 collapse-sm">
            <summary className="collapse-title text-l font-medium">
                {label}
            </summary>
            <div className="collapse-content">{children}</div>
        </details>
    );
};

export default UAccordion;
