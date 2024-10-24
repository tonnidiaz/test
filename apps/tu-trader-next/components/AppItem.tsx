import { IObj } from '@cmn/utils/interfaces';
import Link from 'next/link';
import React from 'react';

const AppItem = ({ app }: {app: IObj}) => {
  return (
    <Link className="flex gap-10px items-center" href={`/apps/${app._id ?? app.id}/vlts`}>
      <div>
        <div className="rounded-full w-60px h-60px card-border flex items-center justify-center">
          <span className="mt-2"><i className="fi fi-br-laptop-mobile fs-25"></i></span>
        </div>
      </div>
      <div>
        <h3 className="fs-18 font-semibold">{app.name}</h3>
        <div className="flex flex-row flex-wrap gap-5px my-2px">
          {app.platforms.map((platform, j) => (
            <div key={j} className="badge badge-neutral badge-lg flex justify-center items-center pdy-4">
              <Link href={`/apps/platform/${platform.name.toLowerCase()}`}>
                <span>
                  <i className={`${platform.icon}`}></i>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default AppItem;