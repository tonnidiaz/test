const lst = [{age: 10}, {age: 20}, {age: 15}]
console.log(lst);

for (let age of lst){
    age.age += 1
}
function updateAge ({age} : { age: (typeof lst)[number]}){
    age.age += 1
}
console.log(lst);

for (let age of lst){
    updateAge({age})
}

console.log(lst);