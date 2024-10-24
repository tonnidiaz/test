import Link from "next/link";
import React from "react";

interface Props extends React.LiHTMLAttributes<{}> {
    title?: string;
    innerClass?: string;
    icon: string;
    to: string;
}
const MenuItem: React.FC<Props> = ({
    title,
    innerClass,
    icon,
    to,
    children,
}) => {
    return (
        <li className="tooltip tooltip-right" data-tip={title}>
            {to ? (
                <Link href={to} className="`${innerClass}`">
                    {icon && <i className={icon} />} {children}
                </Link>
            ) : (
                <span v-else className={`${innerClass}`}>
                    {icon && <i v-if="icon" className={icon} />} {children}
                </span>
            )}
        </li>
    );
};

export default MenuItem;
