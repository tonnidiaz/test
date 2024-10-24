import React from 'react';

interface Props extends React.HTMLAttributes<{}> {
    onSubmit?: (e: any)=>any; state?: any
}
const MyForm: React.FC<Props> = ({ onSubmit, children, ...props }) => {
    const handleSubmit = async (e) => {
        e.preventDefault();
        const btns: HTMLButtonElement[] = Array.from(e.target.querySelectorAll('button[type=submit]'));
        btns.forEach((btn) => {
            btn.disabled = true;
        });
        await onSubmit?.call(this, e);
        btns.forEach((btn) => (btn.disabled = false));
    };

    return (
        <form onSubmit={handleSubmit} {...props}>
            {children}
        </form>
    );
};

export default MyForm;