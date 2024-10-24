import { IObj } from '@cmn/utils/interfaces';
import React, { useEffect, useState } from 'react';
import UTextarea from './UTextarea';

const MyComponent = ({ rows }: {rows: IObj[]}) => {
    const NOTES_KEY = "notes";
    const [notes, setNotes] = useState("");
    const [q, setQ] = useState("");
    
    const tableCols = [
        { key: "i", label: "I" },
        { key: "ts", label: "Timestamp" },
        { key: "side", label: "Side" },
        { key: "c", label: "Close" },
        { key: "balance", label: "Balance" },
    ];

    const filteredRows = rows.filter(row => {
        return Object.values(row).some(value =>
            String(value).toLowerCase().includes(q.toLowerCase())
        );
    });

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
                <UTextarea
                    className="w-50p font-monospace fw-6"
                    value={notes}
                    onChange={setNotes}
                    placeholder="Notes..."
                />
            </div>

            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs uppercase bg-base-200 text-gray-400">
                    <tr>
                        <th className="px-6 py-3">Ind</th>
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">Side</th>
                        <th className="px-6 py-3">Close</th>
                        <th className="px-6 py-3">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredRows.map((row, index) => (
                        <tr key={index} className={`bg-base-100 border-gray-200 font-monospace ${row.class}`}>
                            <th className="px-6 py-3 text-gray-300">Ind: {row.i}</th>
                            <td className="px-6 py-3 font-monospace">
                                {row.enterTs.split('\n').map((el, idx) => (
                                    <div key={idx}>{el}</div>
                                ))}
                                <div className="text-gray-300">{row.ts}</div>
                            </td>
                            <td><span className={row.side.class}>{row.side.value}</span></td>
                            <td>
                                <div>{row.fill}</div>
                                <div className="text-gray-300">{row.c}</div>
                            </td>
                            <td>{row.balance}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
};

export default MyComponent;