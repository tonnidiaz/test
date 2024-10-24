"use client"
// import { coinApiDates } from "@repo/common/src/utils/consts2";
import Image from "next/image";

export default function Home() {

    const sayHi = () =>{
        console.log({coinApiDates: "Hello"});
    } 
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <button onClick={sayHi}>Say hi</button>
     </main>
    </div>
  );
}
