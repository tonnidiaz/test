let lst2 = ["JOHN", "MAYA", "ANNA", "TONY", "SUSHI"];
const chunkSz = 2
for (let i = 0; i < lst2.length; i += chunkSz) {
    const start = i,
        end = i + chunkSz;
    console.log({ start, end });
    console.log('\n')
   lst2.slice(start, end).forEach(el=>{
    console.log(el)
   })
}
