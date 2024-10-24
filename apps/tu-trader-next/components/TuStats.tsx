import React from "react";
import UPopover from "./UPopover";

interface IStat {title: string, subtitle: any, click?: ()=> any, valClasses?: string, titleClasses?: string, classes?: string, hover?: string}

interface IProps extends React.HTMLAttributes<{}>{
    stats:IStat[]
}
const TuStats: React.FC<IProps>= ({stats, ...props}) => {
    return ( <div className={"flex overflow-x-scroll " + props.className} {...props}>
        {stats.map((stat, i)=><div key={`stat-${i}`} className={`stat text-center m-auto ${stat.classes}`}>
        
        <span className={`stat-title ${stat.titleClasses}`}>
        { stat.title}
        </span><UPopover mode="hover" background='bg-primary' panel={stat.hover && <div className="p-2 bg-gray-800 text-white">
                <p className="fs-12">{ stat.subtitle }</p>
                 <span>{ stat.hover }</span>
            </div>}>
        <span title={stat.hover} className={`stat-value ${stat.valClasses} text-center` }>{ stat.subtitle }</span>
        
    </UPopover>
        
    </div>)}
    </div> );
}
 
export default TuStats;
