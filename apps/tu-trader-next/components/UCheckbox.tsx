import React from "react";
import UFormGroup from "./UFormGroup";

interface Props extends React.HTMLAttributes<{}> {
    disabled?: boolean;
    value: boolean;
    setValue: (v: boolean) => any;
    label?: string;
}
const UCheckbox: React.FC<Props> = ({className, disabled, value, setValue, ...props}) => {
    return (
        <UFormGroup
            className={"text-center flex items-center fs-15 gap-1.5 justify-end " + className}
            style={{ flexDirection: "row-reverse" }}
            labelClass="mb-0"
            {...props}
        >
            <input
                checked={value ?? false}
                disabled={disabled}
                type="checkbox"
                onChange={(e) => {
                    const v = e.target.checked
                    console.log({v})
                    setValue(v)}}
                className="checkbox checkbox-xs checkbox-primary border-card"
            />
        </UFormGroup>
    );
};

export default UCheckbox;
