import React, { HTMLAttributes, InputHTMLAttributes, useEffect, useState } from 'react';

interface Props extends InputHTMLAttributes<{}> {value: any; override?: string; onChange: (v: any)=>any}
const InputComponent: React.FC<Props> = ({ value, override = "", onChange, className, ...props }) => {
    const defClass = override.split(" ").includes("class") ? "" : "input input-bordered input-sm";
    const [_value, setValue] = useState(value);

    useEffect(() => {
        setValue(value);
    }, [value]);

    const handleChange = (event) => {
        setValue(event.target.value);
        onChange(event.target.value)
        // Emit the change (in a parent component, you'd handle this)
        // For example: onChange(event.target.value);
    };

    return (
        <input
            autoComplete="all"
            value={_value ?? ''}
            onChange={handleChange}
            className={`${defClass} ${className}`}
            {...props}
        />
    );
};

export default InputComponent;