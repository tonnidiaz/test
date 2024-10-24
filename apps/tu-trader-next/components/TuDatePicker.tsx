import React, { useEffect, useState } from "react";
import CtxMenu from "./CtxMenu";
import { format, isDate } from "date-fns";
import UInput from "./UInput";
import { isValidDate } from "@/utils/funcs";

interface IDate {start: string; end: string}
interface IProps extends React.HTMLAttributes<{}> {
    value?: IDate;
    setValue?: (v: IDate) => any;
}

const defaultDate = {
    start: new Date(Date.now() - 2 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 16),
    end: new Date().toISOString().slice(0, 16),
};

const TuDatePicker: React.FC<IProps> = ({ value = defaultDate, setValue }) => {
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const { start, end } = value;
        const y1 = start.split("-")[0];
        const y2 = end.split("-")[0];
        const _end = end?.replaceAll(y2!, y1!);
        const _date = { ...value, end: _end }
        if (isValidDate(_end) && (_date.start != value.start || _date.end != value.end)) {
            setValue?.call(null, _date);}
    }, [value]);

;

    return (
        <CtxMenu
            open={modalOpen}
            setOpen={(v) => setModalOpen(v)}
            toggler={
                <div
                    className="btn btn-primary btn-sm"

                    // icon="i-heroicons-calendar-days-20-solid"
                >
                    {format(new Date(value.start), "d MMM, yyy, hh:mm")} -
                    {format(new Date(value.end), "d MMM, yyy, hh:mm")}
                </div>
            }
        >
            <div className="card p-2">
                <div className="card-header p-2">
                    <h3>Select range</h3>
                </div>
                <div className="rounded-m sm:flex-row flex flex-col items-center justify-center gap-3">
                    <UInput
                        type="datetime-local"
                        value={value.start}
                        onChange={(v) => setValue?.call(null,{ ...value, start: v })}
                    />
                    <UInput
                        type="datetime-local"
                        value={value.end}
                        onChange={(v) => setValue?.call(null,{ ...value, end: v })}
                    />
                </div>
            </div>
        </CtxMenu>
    );
};

export default TuDatePicker;
