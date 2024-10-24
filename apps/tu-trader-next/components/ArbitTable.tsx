import { IObj } from '@cmn/utils/interfaces';
import React, { useEffect, useState } from 'react';

const ArbitTable = ({ rows }: {rows: IObj[]}) => {
    const [notes, setNotes] = useState('');
    const NOTES_KEY = 'notes';

    useEffect(() => {
        const n = sessionStorage.getItem(NOTES_KEY);
        if (n) setNotes(n);
    }, []);

    useEffect(() => {
        if (notes.length) {
            sessionStorage.setItem(NOTES_KEY, notes);
        }
    }, [notes]);

    return (
        <div className="wp-nowrap">
            <div className="flex px-3 pt-2 pb-3.5">
                <textarea
                    className="w-50p font-monospace fw-6"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes..."
                />
            </div>
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs uppercase bg-base-200 text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">Ind</th>
                        <th scope="col" className="px-6 py-3">Timestamp</th>
                        <th scope="col" className="px-6 py-3">Side</th>
                        <th scope="col" className="px-6 py-3">Close</th>
                        <th scope="col" className="px-6 py-3">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className={`bg-base-100 border-gray-200 font-monospace odd:bg-base-300 mb-3 ${row.class}`}>
                            <th scope="col" className="px-6 py-3 text-gray-300 mb-3">Ind: {i}</th>
                            <td scope="col" className="px-6 py-3 font-monospace fs-13">
                                {typeof row.ts === 'string' ? (
                                    <div className="text-gray-300">{row.ts}</div>
                                ) : (
                                    row.ts.map((ts, idx) => <div key={idx} className="text-gray-300">{ts}</div>)
                                )}
                                {typeof row.side !== 'string' || row.side.toLowerCase().includes('sell') ? (
                                    <div className="text-white fw-6">PERC: {(row.est_perc ?? 0).toFixed(2)}% {(row.perc ?? 0).toFixed(2)}%</div>
                                ) : null}
                            </td>
                            <td scope="col" className="fs-12 mb-2">
                                {typeof row.side === 'string' ? (
                                    <div className={`${row.side.toLowerCase().includes('buy') ? 'text-success' : 'text-error'}`}>{row.side}</div>
                                ) : (
                                    row.side.map((side, idx) => (
                                        <div key={idx} className={`fs-12 mb-2 ${side.includes('BUY') ? 'text-success' : 'text-error'}`}>{side}</div>
                                    ))
                                )}
                            </td>
                            <td scope="col">
                                <div className="mb-2 text-gray-300 fs-12">
                                    {typeof row.px === 'number' ? (
                                        <div>{row.px}</div>
                                    ) : (
                                        row.px.map((px, idx) => <div key={idx}>{px}</div>)
                                    )}
                                </div>
                            </td>
                            <td scope="col">
                                <div className="mb-2 text-gray-300 fs-12">
                                    {typeof row.amt === 'number' ? (
                                        <div><span className="fw-6 text-white" style={{ display: row.ccy ? 'inline' : 'none' }}>{row.ccy}&nbsp;</span>{row.amt}</div>
                                    ) : (
                                        row.amt.map((amt, idx) => <div key={idx}>{amt}</div>)
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ArbitTable;