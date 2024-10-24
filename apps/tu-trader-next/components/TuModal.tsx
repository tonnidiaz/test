import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import TuModalContainer from './TuModalContainer';

interface Props extends React.HtmlHTMLAttributes<{}>{
   value: boolean; onUpdate: (val: boolean)=> any
}

type ChildProps = React.FC<React.HtmlHTMLAttributes<{}>>
const TuModal: React.FC<Props> & {Toggler: ChildProps; Content: ChildProps} = ({ value, onUpdate, children }) => {
    const [modalOpen, setModalOpen] = useState(value);
    const [id, setId] = useState("");

    useEffect(() => {
        setId(`modal-${Date.now()}`);
    }, []);

    useEffect(() => {
        setModalOpen(value);
    }, [value]);

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setModalOpen(true);
        onUpdate(true);
    };

    return (
        <>
            <label htmlFor={id} onClick={handleClick}>
                <TuModal.Toggler/>
            </label>

            {modalOpen && ReactDOM.createPortal(
                <div className={`modal modal-md ${modalOpen ? 'modal-open' : ''}`}>
                    <TuModalContainer value={modalOpen} blank setValue={undefined}>
                        <div className="modal-box min-w-400">
                            <TuModal.Content/>
                        </div>
                    </TuModalContainer>
                    <label className="modal-backdrop" htmlFor={id}>Close</label>
                </div>,
                document.getElementById('ctx-overlay')!
            )}

            <input className="checkbox hidden" type="checkbox" />
        </>
    );
};

TuModal.Toggler = ({children})=> <div>{children}</div>
TuModal.Content = ({children})=> <div>{children}</div>

export default TuModal;